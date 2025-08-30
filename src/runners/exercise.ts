import type { TestResult, BenchmarkConfig } from '../config/types';
import { AgentRunner } from './agent';
import { TestRunner } from './test';
import { ExerciseResetter } from '../exercises/reset';
import type { Logger } from '../utils/logger';
import { join } from 'path';

export class ExerciseRunner {
    constructor(
        private agentRunner: AgentRunner,
        private testRunner: TestRunner,
        private exerciseResetter: ExerciseResetter,
        private logger: Logger,
        private exerciseBasePath: string
    ) {}

    async run(config: BenchmarkConfig, exercise: string): Promise<TestResult> {
        const startTime = Date.now();
        const exercisePath = join(this.exerciseBasePath, 'exercises', 'practice', exercise);

        this.logger.logExerciseStart(exercise);

        // Phase 0: Reset exercise to a clean state
        await this.exerciseResetter.reset(exercisePath, config.verbose);

        const useDocker = config.useDocker ?? true; // Default is to use Docker

        // Phase 1: Run AI Agent
        const agentResult = await this.agentRunner.run(config, exercise, exercisePath, useDocker);

        // Phase 1.5: Restore test files when running locally (in case the agent modified them)
        const testFiles = await this.agentRunner.getTestFiles(exercise);
        await this.exerciseResetter.restoreTestFiles(exercisePath, testFiles);

        // Phase 1.6: Log diff after agent (only in verbose mode)
        if (config.verbose) {
            await this.exerciseResetter.logDiffAfterAgent(exercisePath);
        }

        // Phase 2: Run Tests (always run, even if agent failed)
        const testResult = await this.testRunner.run(config, exercise, exercisePath, useDocker);

        const totalDuration = Date.now() - startTime;
        const overallSuccess = agentResult.success && testResult.success;

        this.logger.logExerciseResult(exercise, overallSuccess, totalDuration);

        return {
            exercise,
            agentSuccess: agentResult.success,
            testSuccess: testResult.success,
            overallSuccess,
            agentError: agentResult.error,
            testError: testResult.error,
            agentDuration: agentResult.duration,
            testDuration: testResult.duration,
            totalDuration
        };
    }
}
