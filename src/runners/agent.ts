import type { AgentResult, BenchmarkConfig } from '../config/types';
import { AgentFactory } from '../agents/factory';
import { ExerciseReader } from '../exercises/reader';
import type { CommandExecutor } from '../utils/shell';
import type { Logger } from '../utils/logger';
import { ProgressMonitor } from '../utils/progress-monitor';
import { join } from 'path';

export class AgentRunner {
    constructor(
        private executor: CommandExecutor,
        private exerciseReader: ExerciseReader,
        private logger: Logger,
        private containerName: string,
        private baseInstruction: string,
        private customInstruction?: string
    ) {}

    async run(config: BenchmarkConfig, exercise: string, exercisePath: string, useDocker: boolean = true): Promise<AgentResult> {
        const startTime = Date.now();

        let progressMonitor: ProgressMonitor | null = null;
        if (config.showProgress) {
            progressMonitor = new ProgressMonitor(this.logger, {
                exercisePath: join(process.cwd(), exercisePath),
                exerciseName: exercise,
                intervalMs: 8000,
                verbose: config.verbose
            });
        }

        try {
            const agentBuilder = AgentFactory.create(config, this.containerName);
            const instructions = await this.exerciseReader.getInstructions(exercise, this.baseInstruction, this.customInstruction);
            const fileList = await this.exerciseReader.getFileList(exercise);
            const baseArgs = await agentBuilder.build(exercisePath, instructions, useDocker, fileList);

            // Add test file mounts only for Docker execution
            const args = useDocker ? this.addTestFileMounts(baseArgs, exercisePath, fileList.testFiles) : baseArgs;

            if (config.verbose) {
                this.logger.logAgentCommand(args);
            }

            if (progressMonitor) {
                progressMonitor.start();
            }

            const execOptions = useDocker ? {} : {
                cwd: join(process.cwd(), exercisePath),
                env: this.getAgentEnvironment(config)
            };
            const result = await this.executor.execute(args, execOptions);
            const duration = Date.now() - startTime;

            if (progressMonitor) {
                progressMonitor.stop();
            }

            if (result.exitCode === 0) {
                this.logger.logAgentSuccess(exercise, duration, config.verbose, result);
                return { exercise, success: true, duration, output: result.stdout };
            } else {
                this.logger.logAgentFailure(exercise, duration, config.verbose, result);

                // Agent failed - exit immediately
                console.error(`❌ Agent failed for ${exercise}. Exiting immediately.`);
                return { exercise, success: false, duration, error: result.stderr, output: result.stdout };
            }
        } catch (error) {
            if (progressMonitor) {
                progressMonitor.stop();
            }

            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.logAgentError(exercise, duration, errorMsg);

            // Agent error - exit immediately
            console.error(`❌ Agent error for ${exercise}: ${errorMsg}. Exiting immediately.`);
            return { exercise, success: false, duration, error: errorMsg };
        }
    }

    async getTestFiles(exercise: string): Promise<string[]> {
        return await this.exerciseReader.getTestFiles(exercise);
    }

    private addTestFileMounts(args: string[], exercisePath: string, testFiles: string[]): string[] {
        const mountIndex = args.findIndex(arg => arg === this.containerName);
        const result = [...args];

        testFiles.forEach(testFile => {
            const hostPath = join(process.cwd(), exercisePath, testFile);
            const containerPath = `/workspace/${testFile}`;
            result.splice(mountIndex, 0, "-v", `${hostPath}:${containerPath}:ro`);
        });

        return result;
    }

    private getAgentEnvironment(config: BenchmarkConfig): Record<string, string> {
        const baseEnv = {
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
            GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
            GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
            DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY || '',
            XAI_API_KEY: process.env.XAI_API_KEY || ''
        } as Record<string, string>;


        // Agent-specific environment variables
        switch (config.agent) {
            case 'claude':
                if (config.provider === 'dashscope') {
                    baseEnv.ANTHROPIC_AUTH_TOKEN = process.env.DASHSCOPE_API_KEY || baseEnv.ANTHROPIC_API_KEY;
                    baseEnv.ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://dashscope-intl.aliyuncs.com/api/v2/apps/claude-code-proxy';
                }
                return baseEnv;
            case 'goose':
                return {
                    ...baseEnv,
                    GOOSE_MODEL: config.model,
                    GOOSE_PROVIDER: config.provider,
                    GOOSE_DISABLE_KEYRING: '1'
                };
            case 'aider':
                return {
                    ...baseEnv,
                    AIDER_GIT: 'false',
                    AIDER_AUTO_COMMITS: 'false',
                    AIDER_SHOW_RELEASE_NOTES: 'false',
                    AIDER_SKIP_SANITY_CHECK_REPO: 'true',
                    AIDER_CHAT_HISTORY_FILE: '/dev/null',
                    AIDER_INPUT_HISTORY_FILE: '/dev/null'
                };
            case 'codex':
                return {
                    ...baseEnv,
                    CODEX_RUST: '1'
                };
            case 'gemini':
                return {
                    ...baseEnv,
                    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
                    GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
                };
            case 'qwen':
                if (config.provider === 'openrouter') {
                    return {
                        ...baseEnv,
                        OPENAI_BASE_URL: "https://openrouter.ai/api/v1",
                        OPENAI_API_KEY: process.env.OPENROUTER_API_KEY || "",
                        OPENAI_MODEL: config.model
                    };
                } else {
                    return {
                        OPENAI_BASE_URL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
                        OPENAI_API_KEY: process.env.DASHSCOPE_API_KEY || "",
                        OPENAI_MODEL: config.model,
                        GOOGLE_API_KEY: '',
                        GEMINI_API_KEY: ''
                    };
                }
            default:
                return baseEnv;
        }
    }
}
