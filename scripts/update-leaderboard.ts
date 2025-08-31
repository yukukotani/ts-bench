import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { existsSync } from 'fs';

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
    leaderboardData = { lastUpdated: new Date().toISOString(), results: {} };
  }

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

async function updateReadmeWithTable(table: string) {
  const begin = '<!-- BEGIN_LEADERBOARD -->';
  const end = '<!-- END_LEADERBOARD -->';
  const block = `${begin}\n${table}\n${end}`;

  const content = await readFile(README_PATH, 'utf-8');

  const markerRe = new RegExp(`${escapeRegExp(begin)}[\n\r\s\S]*?${escapeRegExp(end)}`);
  if (markerRe.test(content)) {
    const replaced = content.replace(markerRe, block);
    await writeFile(README_PATH, replaced, 'utf-8');
    return;
  }

  const lines = content.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => /^##\s+Leaderboard\s*$/i.test(l.trim()));
  if (headerIdx >= 0) {
    const before = lines.slice(0, headerIdx + 1).join('\n');
    const after = lines.slice(headerIdx + 1).join('\n');
    const combined = `${before}\n\n${block}\n\n${after}`;
    await writeFile(README_PATH, combined, 'utf-8');
    return;
  }

  await writeFile(README_PATH, `${block}\n\n${content}`, 'utf-8');
}

async function ensureDirectoryExists(filePath: string) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
