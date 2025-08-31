# Environment Design

## Policy Overview

- Execution modes: "GHA: Native" and "Local: Docker (default)/Native (optional)".
- Emphasis on reproducibility and safety: When running in Docker, pass environment variables explicitly and mount test files as read-only.
- Container name unified as `TS_BENCH_CONTAINER = "ts-bench-container"`.

---

## Execution Modes

- GHA (Native)
    - Default for `use_docker` in `.github/workflows/benchmark.yml` is `false`.
    - Agent CLIs are installed on the runner and executed directly.

- Local (Docker, default)
    - Uses the included `Dockerfile` to eliminate environment differences.
    - Run with CLI option `--docker`.

- Local (Native, for debugging)
    - Install agent CLIs on the host and run without `--docker`.

---

## Container Design

- Container name: `ts-bench-container` (`TS_BENCH_CONTAINER`)
- Base image: `oven/bun:latest`
- Included components:
    - Git/Curl/NPM/Unzip
    - Agent CLIs (aider, goose, claude-code, codex, gemini-cli, qwen-code, opencode-ai, cursor)
    - corepack (Enable `corepack@0.29.4` compatible with Node 18)
    - PATH additions: `/root/.local/bin:/root/.cursor/bin`

## Execution Strategy (Docker / Local)

- Docker Execution
    - Base args: `docker run --rm -i`
    - Workspace: Mount host exercise directory to `/workspace` and set as working directory.
    - Test files: Mount individually as read-only (`-v host:container:ro`).
    - Environment variables: Only explicitly set keys are passed with `-e KEY=VALUE` (no implicit passthrough).
    - Implementation reference: `src/execution/docker-strategy.ts` / `src/utils/docker.ts`

- Local Execution
    - Change to each exercise directory before running (for simple path resolution).
    - Implementation reference: `src/runners/test.ts` / `src/runners/test-only.ts`

---

## Testing and Package Management

- Common test command: `corepack yarn && corepack yarn test`
- Exercism exercises assume Yarn v4 (e.g., `packageManager: yarn@4.5.1`).
- In container, `corepack@0.29.4` is enabled (compatible with Node 18).

---

## GitHub Actions (Native Execution)

- Workflow: `.github/workflows/benchmark.yml`
- Default for `use_docker` is `false` (native). Add `--docker` only when specified.
- Agent CLIs installed on runner ("Install agent CLI (local mode)" step).
- Secrets: Pass `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GROQ_API_KEY` etc. via `env`.
- Example command: `bun src/index.ts --agent <agent> --model <model> [--docker] ...`

---

## Main CLI Options

- `--agent <agent>`: Agent to use (claude/goose/aider/codex/gemini/opencode/qwen/cursor)
- `--model <model>`: Model to use
- `--provider <provider>`: openai/anthropic/google/openrouter/dashscope/xai/deepseek
- `--docker`: Switch to Docker execution
- `--exercise <name|N|a,b,c>`: Specify exercise (name / first N / multiple)
- `--exercism-path <path>`: Exercism root (default: `exercism-typescript`)
- `--test-only` / `--print-instructions`: Test only / show instructions
- `--save-result --result-dir <dir>`: Save results
- `--timeout <sec>`: Timeout per exercise (default: 300)

---

## Directories and I/O

- Exercise root: `exercism-typescript` (`EXERCISM_PRACTICE_PATH`)
- Exercise path: `exercises/practice/<exercise>`
- Output (example): Use `--save-result --result-dir ./results` to export JSON

---

## Security / Reproducibility

- Docker uses `--rm` to discard containers after each run (no state left).
- Test files are mounted read-only (prevents unintended modification during testing).
- Environment variables are only passed explicitly with `-e KEY=VALUE` (no passthrough for unset keys).
- corepack/Yarn versions are fixed to improve reproducibility of dependency resolution.

---

## Local Usage

- Docker execution (default)
    1) Build: `docker build -t ts-bench-container .`
    2) Run: `bun src/index.ts --agent aider --model gpt-4o --docker`

- Native execution (debug)
    - Install agent CLIs on host (see GHA install steps)
    - Run: `bun src/index.ts --agent aider --model gpt-4o`

---

## Troubleshooting

- corepack not found: `npm i -g corepack@0.29.4 && corepack enable`
- Yarn workspace warnings: Run in each exercise directory (handled by design for both Docker/local).
- Agent CLI not found (GHA native): Check install step and PATH (`$HOME/.local/bin`, etc.).

---

## Customization Guidelines

- Change container name: `src/config/constants.ts`
- Add agent CLIs: Add install steps to `Dockerfile`
- Add environment variables: Only pass those with values (Docker arg `-e KEY=VALUE`); specify as needed
- Update Node/corepack: Update base image/version and check compatibility

