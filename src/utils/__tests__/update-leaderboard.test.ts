import { describe, it, expect } from 'bun:test';

import {
  buildTopTable,
  insertBlockAtHeaderOrTop,
  applyLeaderboardBlock,
  type LeaderboardData,
} from '../leaderboard.ts';

describe('insertBlockAtHeaderOrTop', () => {
  it('normalizes consecutive blank lines after header and inserts block', () => {
    const content = ['# Title', '', '## Leaderboard', '', '', 'para1', 'para2'].join('\n');
    const block = ['<!-- BEGIN_LEADERBOARD -->', 'TBL', '<!-- END_LEADERBOARD -->'].join('\n');

    const out = insertBlockAtHeaderOrTop(content, block);

    expect(out).toContain('## Leaderboard\n\n<!-- BEGIN_LEADERBOARD -->');
    expect(out).toContain('<!-- END_LEADERBOARD -->\n\npara1');
  });

  it('inserts at top when header is absent, separated by one blank line', () => {
    const content = ['\n', '# Doc', '', 'body'].join('\n');
    const block = ['<!-- BEGIN_LEADERBOARD -->', 'TBL', '<!-- END_LEADERBOARD -->'].join('\n');
    const out = insertBlockAtHeaderOrTop(content, block);
    expect(out.startsWith('<!-- BEGIN_LEADERBOARD -->\nTBL\n<!-- END_LEADERBOARD -->\n\n# Doc')).toBeTrue();
  });
});

describe('applyLeaderboardBlock', () => {
  const table1 = ['| h |', '| - |', '| 1 |'].join('\n');
  const table2 = ['| h |', '| - |', '| 2 |'].join('\n');

  it('replaces existing block without duplicating surrounding blank lines', () => {
    const before = [
      '# T',
      '',
      '## Leaderboard',
      '',
      '<!-- BEGIN_LEADERBOARD -->',
      'OLD',
      '<!-- END_LEADERBOARD -->',
      '',
      'Next',
    ].join('\n');

    const out = applyLeaderboardBlock(before, table1);
    expect(out).toContain('## Leaderboard\n\n<!-- BEGIN_LEADERBOARD -->');
    expect(out).toContain('<!-- END_LEADERBOARD -->\n\nNext');
    expect(out).not.toContain('\n\n\n');
    expect(out).toContain('| 1 |');
  });

  it('is idempotent when applying the same table repeatedly', () => {
    const start = ['# T', '', '## Leaderboard', '', 'Next'].join('\n');
    const once = applyLeaderboardBlock(start, table1);
    const twice = applyLeaderboardBlock(once, table1);
    expect(twice).toBe(once);
  });

  it('replaces the block when table content changes', () => {
    const start = ['# T', '', '## Leaderboard', '', 'Next'].join('\n');
    const once = applyLeaderboardBlock(start, table1);
    const replaced = applyLeaderboardBlock(once, table2);
    expect(replaced).not.toBe(once);
    expect(replaced).toContain('| 2 |');
  });
});

describe('buildTopTable', () => {
  it('generates header and rows with no extra blank lines', () => {
    const data: LeaderboardData = {
      lastUpdated: new Date().toISOString(),
      results: {
        'a-m': {
          metadata: { agent: 'a', model: 'm', provider: 'p', timestamp: new Date().toISOString() },
          summary: {
            successRate: 50,
            totalDuration: 0,
            avgDuration: 1000,
            successCount: 1,
            totalCount: 2,
            agentSuccessCount: 0,
            testSuccessCount: 0,
            testFailedCount: 0,
          },
          results: [],
        },
        'b-m': {
          metadata: { agent: 'b', model: 'm', provider: 'p', timestamp: new Date().toISOString() },
          summary: {
            successRate: 80,
            totalDuration: 0,
            avgDuration: 500,
            successCount: 8,
            totalCount: 10,
            agentSuccessCount: 0,
            testSuccessCount: 0,
            testFailedCount: 0,
          },
          results: [],
        },
      },
    };

    const table = buildTopTable(data, 10);
    const lines = table.split(/\n/);
    expect(lines[0]).toMatch(/^\| Rank \|/);
    expect(lines[1]).toMatch(/^\|:----:/);
    expect(lines.length).toBe(1 + 1 + 2); // header + separator + 2 rows
    // Highest successRate (b) should rank first
    expect(lines[2]).toMatch(/\| 1 \| b \|/);
  });
});
