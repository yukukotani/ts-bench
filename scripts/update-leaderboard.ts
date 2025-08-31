import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { existsSync } from 'fs';
import { EOL } from 'os';

interface SavedBenchmarkResult {
  metadata: {
    agent: string;
    model: string;
    provider: string;
    version?: string;
    timestamp: string;
    exerciseCount?: number;
    benchmarkVersion?: string;
    generatedBy?: string;
    totalExercises?: number;
    runUrl?: string;
    runId?: string;
    artifactName?: string;
  };
  summary: {
    successRate: number;
    totalDuration: number;
    avgDuration: number;
    successCount: number;
    totalCount: number;
    agentSuccessCount: number;
    testSuccessCount: number;
    testFailedCount: number;
  };
  results: unknown[];
}

interface LeaderboardData {
  lastUpdated: string;
  results: Record<string, SavedBenchmarkResult>; // key: agent-model
}

const LEADERBOARD_PATH = './public/data/leaderboard.json';
const README_PATH = './README.md';
const COMMIT_BODY_PATH = './commit-body.md';
const TOP_N = Number(process.env.TOP_N ?? '10');

async function main() {
  const newResultPath = process.argv[2];
  if (!newResultPath) {
    console.error('Usage: bun scripts/update-leaderboard.ts <path/to/new-result.json>');
    process.exit(1);
  }

  let leaderboardData: LeaderboardData;
  if (existsSync(LEADERBOARD_PATH)) {
    leaderboardData = JSON.parse(await readFile(LEADERBOARD_PATH, 'utf-8')) as LeaderboardData;
  } else {
    leaderboardData = { lastUpdated: '', results: {} };
  }
  const oldLeaderboardData: LeaderboardData = JSON.parse(JSON.stringify(leaderboardData));

  const newResult: SavedBenchmarkResult = JSON.parse(await readFile(newResultPath, 'utf-8')) as SavedBenchmarkResult;
  validateResult(newResult);
  const key = `${newResult.metadata.agent}-${newResult.metadata.model}`;

  const RUN_URL = process.env.RUN_URL;
  const RUN_ID = process.env.RUN_ID;
  const ARTIFACT_NAME = process.env.ARTIFACT_NAME;
  const merged: SavedBenchmarkResult = {
    ...newResult,
    metadata: {
      ...newResult.metadata,
      runUrl: RUN_URL || newResult.metadata.runUrl,
      runId: RUN_ID || newResult.metadata.runId,
      artifactName: ARTIFACT_NAME || newResult.metadata.artifactName,
    },
  };

  leaderboardData.results[key] = merged;
  leaderboardData.lastUpdated = new Date().toISOString();

  try {
    const diffMarkdown = generateDiffMarkdown(oldLeaderboardData, leaderboardData, key);
    await writeFile(COMMIT_BODY_PATH, diffMarkdown, 'utf-8');
    console.log(`📝 Commit body generated: ${COMMIT_BODY_PATH}`);
  } catch (e) {
    console.warn('Failed to generate commit body markdown:', e);
  }

  await ensureDirectoryExists(LEADERBOARD_PATH);
  await writeFile(LEADERBOARD_PATH, JSON.stringify(leaderboardData, null, 2), 'utf-8');
  console.log(`✅ Updated: ${LEADERBOARD_PATH}`);

  const markdownTable = buildTopTable(leaderboardData, TOP_N);
  await updateReadmeWithTable(markdownTable);
  console.log('✅ README.md updated with Top leaderboard');
}

function validateResult(r: SavedBenchmarkResult) {
  if (!r || !r.metadata || !r.summary) {
    throw new Error('Invalid result JSON: missing metadata/summary');
  }
  const requiredMeta = ['agent', 'model', 'provider', 'timestamp'] as const;
  for (const k of requiredMeta) {
    if (!(k in r.metadata)) throw new Error(`Invalid result JSON: metadata.${k} missing`);
  }
  const requiredSummary = ['successRate', 'avgDuration', 'successCount', 'totalCount'] as const;
  for (const k of requiredSummary) {
    if (!(k in r.summary)) throw new Error(`Invalid result JSON: summary.${k} missing`);
  }
}

function buildTopTable(data: LeaderboardData, topN: number): string {
  const records = Object.values(data.results);
  const sorted = records
    .slice()
    .sort((a, b) => {
      if (b.summary.successRate !== a.summary.successRate) {
        return b.summary.successRate - a.summary.successRate;
      }
      return a.summary.avgDuration - b.summary.avgDuration;
    })
    .slice(0, Math.max(0, topN));

  const header = '| Rank | Agent | Model | Success Rate | Solved | Avg Time | Result |';
  const separator = '|:----:|:------|:------|:--------------:|:------:|:----------:|:-----:|';

  const rows = sorted.map((r, i) => {
    const rank = i + 1;
    const agent = r.metadata.agent;
    const model = r.metadata.model;
    const successRate = `${Number(r.summary.successRate).toFixed(1)}%`;
    const solved = `${r.summary.successCount}/${r.summary.totalCount}`;
    const avgTime = `${(Number(r.summary.avgDuration) / 1000).toFixed(1)}s`;
    const runUrl = (r.metadata as any).runUrl as string | undefined;
    const runId = (r.metadata as any).runId as string | undefined;
    let label = 'run';
    if (runId && /\d+/.test(runId)) {
      label = `#${runId.slice(-6)}`;
    } else if (runUrl) {
      const m = runUrl.match(/runs\/(\d+)/);
      if (m) label = `#${m[1].slice(-6)}`;
    }
    const resultCell = runUrl ? `[${label}](${runUrl})` : '-';
    return `| ${rank} | ${agent} | ${model} | **${successRate}** | ${solved} | ${avgTime} | ${resultCell} |`;
  });

  return [header, separator, ...rows].join('\n');
}

function getRankedList(data: LeaderboardData) {
  return Object.entries(data.results)
    .map(([k, r]) => ({ key: k, ...r }))
    .sort((a: any, b: any) => {
      if (b.summary.successRate !== a.summary.successRate) {
        return b.summary.successRate - a.summary.successRate;
      }
      return a.summary.avgDuration - b.summary.avgDuration;
    })
    .map((r, i) => ({
      key: r.key as string,
      rank: i + 1,
      metadata: r.metadata,
      summary: r.summary,
    }));
}

function generateDiffMarkdown(oldData: LeaderboardData, newData: LeaderboardData, updatedKey: string): string {
  const oldRanks = getRankedList(oldData);
  const newRanks = getRankedList(newData);

  const oldRankMap = new Map(oldRanks.map((r) => [r.key, r]));
  const updatedEntry = newRanks.find((r) => r.key === updatedKey);

  if (!updatedEntry) return 'No changes detected.';

  const oldEntry = oldRankMap.get(updatedKey);
  const lines: string[] = [];

  const keyLabel = `\`${updatedKey}\``;
  if (!oldEntry) {
    lines.push(`🚀 New Entry: ${keyLabel} entered Leaderboard at rank ${updatedEntry.rank}`);
  } else {
    if (updatedEntry.rank < oldEntry.rank) {
      lines.push(`🔼 Rank Up: ${keyLabel} from ${oldEntry.rank} → ${updatedEntry.rank}`);
    } else if (updatedEntry.rank > oldEntry.rank) {
      lines.push(`🔽 Rank Down: ${keyLabel} from ${oldEntry.rank} → ${updatedEntry.rank}`);
    } else {
      lines.push(`🔄 Rank Unchanged: ${keyLabel} remains at ${updatedEntry.rank}`);
    }
  }

  // Explicit Leaderboard rank transition without '#'
  const oldRankStr = oldEntry ? String(oldEntry.rank) : 'N/A';
  lines.push(`- Leaderboard Rank: ${oldRankStr} -> ${updatedEntry.rank}`);

  const oldRate = oldEntry ? Number(oldEntry.summary.successRate).toFixed(1) + '%' : 'N/A';
  const newRate = Number(updatedEntry.summary.successRate).toFixed(1) + '%';
  lines.push(`- Success Rate: ${newRate} (was ${oldRate})`);

  const oldTime = oldEntry ? (Number(oldEntry.summary.avgDuration) / 1000).toFixed(1) + 's' : 'N/A';
  const newTime = (Number(updatedEntry.summary.avgDuration) / 1000).toFixed(1) + 's';
  lines.push(`- Avg Time: ${newTime} (was ${oldTime})`);

  return lines.join(EOL);
}

async function updateReadmeWithTable(table: string) {
  const beginRaw = '<!-- BEGIN_LEADERBOARD -->';
  const endRaw = '<!-- END_LEADERBOARD -->';
  const block = `${beginRaw}\n${table}\n${endRaw}`;

  let content = await readFile(README_PATH, 'utf-8');

  const beginRe = /<!--\s*BEGIN_LEADERBOARD\s*-->/gi;
  const endRe = /<!--\s*END_LEADERBOARD\s*-->/gi;

  const beginMatches = [...content.matchAll(beginRe)];
  const endMatches = [...content.matchAll(endRe)];

  if (beginMatches.length > 0 && endMatches.length > 0) {
    const sectionReAll = /<!--\s*BEGIN_LEADERBOARD\s*-->[\s\S]*?<!--\s*END_LEADERBOARD\s*-->/gi;
    content = content.replace(sectionReAll, '');
    content = insertBlockAtHeaderOrTop(content, block);
    await writeFile(README_PATH, content, 'utf-8');
    return;
  }

  content = insertBlockAtHeaderOrTop(content, block);
  await writeFile(README_PATH, content, 'utf-8');
}

function insertBlockAtHeaderOrTop(content: string, block: string): string {
  const lines = content.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => /^\s{0,3}##\s+Leaderboard\s*$/i.test(l));
  if (headerIdx >= 0) {
    const before = lines.slice(0, headerIdx + 1).join('\n');
    const after = lines.slice(headerIdx + 1).join('\n');
    return `${before}\n\n${block}\n\n${after}`;
  }
  return `${block}\n\n${content}`;
}

async function ensureDirectoryExists(filePath: string) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
