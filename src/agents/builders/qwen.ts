import type { AgentBuilder, AgentConfig } from '../types';
import { escapeShellArg } from '../../utils/shell';
import { BaseAgentBuilder } from '../../utils/docker';

export class QwenAgentBuilder extends BaseAgentBuilder implements AgentBuilder {
    constructor(agentConfig: AgentConfig) {
        super(agentConfig);
    }

    protected getEnvironmentVariables(): Record<string, string> {
        const baseEnv: Record<string, string> = {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
            OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "",
            PROXY: process.env.PROXY || ""
        };

        // OpenRouter specific configuration
        if (this.config.provider === 'openrouter') {
            const env = {
                ...baseEnv,
                OPENAI_BASE_URL: "https://openrouter.ai/api/v1",
                OPENAI_API_KEY: process.env.OPENROUTER_API_KEY || "",
                OPENAI_MODEL: this.config.model
            };
            console.log('[QwenAgent] OpenRouter env:', {
                OPENAI_BASE_URL: env.OPENAI_BASE_URL,
                OPENAI_API_KEY: env.OPENAI_API_KEY ? '***' : '(empty)',
                OPENAI_MODEL: env.OPENAI_MODEL
            });
            return env;
        }

        console.log('[QwenAgent] Default env:', {
            OPENAI_BASE_URL: baseEnv.OPENAI_BASE_URL || '(default)',
            OPENAI_API_KEY: baseEnv.OPENAI_API_KEY ? '***' : '(empty)'
        });
        return baseEnv;
    }

    protected getDockerShellCommand(instructions: string, _fileList?: import('../types').FileList): string {
        return `qwen -y -m ${this.config.model} -p '${escapeShellArg(instructions)}'`;
    }

    async buildLocalCommand(_exercisePath: string, instructions: string, _fileList?: import('../types').FileList): Promise<string[]> {
        return [
            "qwen",
            "--debug",
            "-y",
            "-p", instructions
        ];
    }
} 