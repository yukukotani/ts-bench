import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { existsSync } from 'fs';
import {
  type SavedBenchmarkResult,
  type LeaderboardData,
  validateResult,
  buildTopTable,
  applyLeaderboardBlock,
} from '../src/utils/leaderboard.ts';

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

  const newResult: SavedBenchmarkResult = JSON.parse(
    await readFile(newResultPath, 'utf-8'),
  ) as SavedBenchmarkResult;
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

// validateResult & buildTopTable are imported from utils

async function updateReadmeWithTable(table: string) {
  const beginRaw = '<!-- BEGIN_LEADERBOARD -->';
  const endRaw = '<!-- END_LEADERBOARD -->';
  const block = `${beginRaw}\n${table}\n${endRaw}`;

  let content = await readFile(README_PATH, 'utf-8');
  const next = applyLeaderboardBlock(content, table);
  await writeFile(README_PATH, next, 'utf-8');
}


async function ensureDirectoryExists(filePath: string) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

if ((import.meta as any).main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
