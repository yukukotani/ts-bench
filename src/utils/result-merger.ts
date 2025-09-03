import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

export interface BenchmarkResult {
  exercise: string;
  agent: string;
  success: boolean;
  duration: number;
  error?: string;
  timestamp: string;
}

export interface BenchmarkData {
  lastUpdated: string;
  totalRuns: number;
  results: BenchmarkResult[];
  summary: {
    byAgent: Record<string, { total: number; success: number; }>;
    byExercise: Record<string, { total: number; success: number; }>;
  };
}

export class ResultMerger {
  private dataPath: string;

  constructor(dataPath: string = './public/data/latest-results.json') {
    this.dataPath = dataPath;
  }

  /**
   * Load existing results file
   */
  loadExisting(): BenchmarkData {
    if (!existsSync(this.dataPath)) {
      return this.createEmptyData();
    }

    try {
      const content = readFileSync(this.dataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Failed to load existing data: ${error}`);
      return this.createEmptyData();
    }
  }

  /**
   * Merge new results with existing data
   */
  mergeResults(newResults: BenchmarkResult[]): BenchmarkData {
    const existing = this.loadExisting();
    
    // Remove duplicates (keep latest result for each exercise + agent combination)
    const resultMap = new Map<string, BenchmarkResult>();
    
    // Add existing results
    existing.results.forEach(result => {
      const key = `${result.exercise}-${result.agent}`;
      resultMap.set(key, result);
    });
    
    // Overwrite with new results
    newResults.forEach(result => {
      const key = `${result.exercise}-${result.agent}`;
      resultMap.set(key, result);
    });

    const mergedResults = Array.from(resultMap.values());
    
    return {
      lastUpdated: new Date().toISOString(),
      totalRuns: mergedResults.length,
      results: mergedResults,
      summary: this.generateSummary(mergedResults)
    };
  }

  /**
   * Save results to file
   */
  saveResults(data: BenchmarkData): void {
    const dir = this.dataPath.split('/').slice(0, -1).join('/');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
    console.log(`Results saved to ${this.dataPath}`);
  }

  /**
   * Add new results and save to file
   */
  addAndSave(newResults: BenchmarkResult[]): void {
    const merged = this.mergeResults(newResults);
    this.saveResults(merged);
  }

  private createEmptyData(): BenchmarkData {
    return {
      lastUpdated: new Date().toISOString(),
      totalRuns: 0,
      results: [],
      summary: { byAgent: {}, byExercise: {} }
    };
  }

  private generateSummary(results: BenchmarkResult[]) {
    const byAgent: Record<string, { total: number; success: number; }> = {};
    const byExercise: Record<string, { total: number; success: number; }> = {};

    results.forEach(result => {
      // Aggregate by agent
      const agentSummary = byAgent[result.agent];
      if (agentSummary) {
        agentSummary.total++;
        if (result.success) agentSummary.success++;
      } else {
        byAgent[result.agent] = { total: 1, success: result.success ? 1 : 0 };
      }

      // Aggregate by exercise
      const exerciseSummary = byExercise[result.exercise];
      if (exerciseSummary) {
        exerciseSummary.total++;
        if (result.success) exerciseSummary.success++;
      } else {
        byExercise[result.exercise] = { total: 1, success: result.success ? 1 : 0 };
      }
    });

    return { byAgent, byExercise };
  }
}
