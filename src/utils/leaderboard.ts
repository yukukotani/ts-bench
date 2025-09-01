export interface SavedBenchmarkResult {
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

export interface LeaderboardData {
  lastUpdated: string;
  // key: `${agent}-${model}`
  results: Record<string, SavedBenchmarkResult>;
}

export function validateResult(r: SavedBenchmarkResult) {
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

export function buildTopTable(data: LeaderboardData, topN: number): string {
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

export function insertBlockAtHeaderOrTop(content: string, block: string): string {
  const lines = content.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => /^\s{0,3}##\s+Leaderboard\s*$/i.test(l));

  if (headerIdx >= 0) {
    const before = lines.slice(0, headerIdx + 1).join('\n');

    let i = headerIdx + 1;
    while (i < lines.length && lines[i]?.trim() === '') i++;
    const after = lines.slice(i).join('\n');

    return `${before}\n\n${block}\n\n${after}`;
  }

  const contentNormalized = content.replace(/^\n+/, '');
  return `${block}\n\n${contentNormalized}`;
}

export function applyLeaderboardBlock(readmeContent: string, table: string): string {
  const beginRaw = '<!-- BEGIN_LEADERBOARD -->';
  const endRaw = '<!-- END_LEADERBOARD -->';
  const block = `${beginRaw}\n${table}\n${endRaw}`;

  const sectionWithPadding = new RegExp(
    String.raw`\n?\s*<!--\s*BEGIN_LEADERBOARD\s*-->[\s\S]*?<!--\s*END_LEADERBOARD\s*-->\s*\n?`,
    'gi',
  );
  const stripped = readmeContent.replace(sectionWithPadding, '\n');

  return insertBlockAtHeaderOrTop(stripped, block);
}
