#!/usr/bin/env bash

set -euo pipefail

# GitHub Actions の実行履歴を一括削除（実行中は除外）
# - gh CLI が必要: https://cli.github.com/
# - 実行中/キュー中(run.status != completed)は削除対象から除外します
# - デフォルトは確認プロンプトあり。--dry-run で削除せず表示のみ
#
# 使い方:
#   bash scripts/delete-gha-runs.sh [オプション]
#
# 主なオプション:
#   -R, --repo OWNER/REPO   対象リポジトリ。省略時は gh のカレント判定に従う
#       --branch BRANCH     対象ブランチの実行履歴に絞る
#   -y, --yes               確認なしで削除を実行
#       --dry-run           削除せず対象IDのみ表示
#   -h, --help              このヘルプ

usage() {
  cat <<'USAGE'
GitHub Actions の実行履歴を一括削除（実行中は除外）

使い方:
  bash scripts/delete-gha-runs.sh [オプション]

オプション:
  -R, --repo OWNER/REPO   対象リポジトリ
      --branch BRANCH     対象ブランチに絞る
  -y, --yes               確認なしで削除
      --dry-run           削除せず対象IDを表示
  -h, --help              このヘルプ

例:
  # カレントのリポジトリを対象に、削除対象を確認のみ
  bash scripts/delete-gha-runs.sh --dry-run

  # 明示したリポジトリで、mainブランチの完了済みRunsを確認後に削除
  bash scripts/delete-gha-runs.sh -R owner/repo --branch main

  # 確認なしで削除を実行
  bash scripts/delete-gha-runs.sh -R owner/repo -y
USAGE
}

if ! command -v gh >/dev/null 2>&1; then
  echo "[error] gh コマンドが見つかりません。https://cli.github.com/ からインストールしてください" >&2
  exit 1
fi

# 引数処理
REPO_SLUG=""
BRANCH=""
ASSUME_YES=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -R|--repo)
      [[ $# -ge 2 ]] || { echo "[error] $1 の引数が不足しています" >&2; exit 1; }
      REPO_SLUG="$2"; shift 2;;
    --branch)
      [[ $# -ge 2 ]] || { echo "[error] $1 の引数が不足しています" >&2; exit 1; }
      BRANCH="$2"; shift 2;;
    -y|--yes)
      ASSUME_YES=1; shift;;
    --dry-run)
      DRY_RUN=1; shift;;
    -h|--help)
      usage; exit 0;;
    *)
      echo "[error] 不明なオプション: $1" >&2
      usage
      exit 1;;
  esac
done

# 認証確認（未認証ならメッセージのみ表示して終了）
if ! gh auth status >/dev/null 2>&1; then
  echo "[error] gh が未認証です。'gh auth login' を実行してください" >&2
  exit 1
fi

# リポジトリ解決（未指定ならカレントの GH リポジトリを推定）
if [[ -z "$REPO_SLUG" ]]; then
  set +e
  REPO_SLUG=$(gh repo view --json owner,name -q '.owner.login+"/"+.name' 2>/dev/null)
  rc=$?
  set -e
  if [[ $rc -ne 0 || -z "$REPO_SLUG" ]]; then
    echo "[error] 対象リポジトリを特定できません。'-R owner/repo' を指定してください" >&2
    exit 1
  fi
fi

OWNER=${REPO_SLUG%%/*}
REPO=${REPO_SLUG#*/}
if [[ -z "$OWNER" || -z "$REPO" || "$OWNER" == "$REPO" ]]; then
  echo "[error] --repo は 'owner/repo' 形式で指定してください (入力: '$REPO_SLUG')" >&2
  exit 1
fi

# 対象IDの取得（completed のみ = 実行中/キュー中は除外）
cmd=(gh api -X GET "/repos/$OWNER/$REPO/actions/runs" --paginate -F per_page=100 -F status=completed)
if [[ -n "$BRANCH" ]]; then
  cmd+=(-F "branch=$BRANCH")
fi
cmd+=(--jq '.workflow_runs[].id')

set +e
RUN_IDS="$(${cmd[@]})"
status=$?
set -e
if [[ $status -ne 0 ]]; then
  echo "[error] 実行履歴の取得に失敗しました" >&2
  exit $status
fi

# 件数カウント
COUNT=$(printf "%s\n" "$RUN_IDS" | sed '/^$/d' | wc -l | awk '{print $1}')

if [[ "$COUNT" -eq 0 ]]; then
  echo "削除対象はありません（completed の実行履歴が見つかりませんでした）"
  exit 0
fi

echo "対象件数: $COUNT"
if [[ $DRY_RUN -eq 1 ]]; then
  echo "--dry-run: 以下の run_id を削除対象として表示します"
  printf "%s\n" "$RUN_IDS"
  exit 0
fi

if [[ $ASSUME_YES -ne 1 ]]; then
  echo "先頭10件の run_id を表示します:"
  printf "%s\n" "$RUN_IDS" | head -n 10
  read -r -p "上記を含む合計 $COUNT 件を削除します。よろしいですか? [y/N] " answer
  case "$answer" in
    y|Y|yes|YES) ;; # 続行
    *) echo "キャンセルしました"; exit 0;;
  esac
fi

echo "削除を開始します..."
ok=0; ng=0
while IFS= read -r id; do
  [[ -z "$id" ]] && continue
  if gh api -X DELETE "/repos/$OWNER/$REPO/actions/runs/$id" >/dev/null 2>&1; then
    echo "deleted: $id"
    ((ok++))
  else
    echo "failed : $id" >&2
    ((ng++))
  fi
  # レートリミット緩和のため軽く待機
  sleep 0.2
done <<< "$RUN_IDS"

echo "完了しました (成功: $ok, 失敗: $ng)"
