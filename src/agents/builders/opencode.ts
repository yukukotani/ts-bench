import type { AgentBuilder, AgentConfig } from '../types';
import { escapeShellArg } from '../../utils/shell';
import { BaseAgentBuilder } from '../../utils/docker';

export class OpenCodeAgentBuilder extends BaseAgentBuilder implements AgentBuilder {
    constructor(agentConfig: AgentConfig) {
        super(agentConfig);
    }

    protected getEnvironmentVariables(): Record<string, string> {
        const baseEnv = {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
            GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "",
            GEMINI_API_KEY: process.env.GOOGLE_API_KEY || ""
        } as Record<string, string>;

        if (this.config.provider === 'xai') {
            return {
                ...baseEnv,
                XAI_API_KEY: process.env.XAI_API_KEY || ""
            };
        }

        return baseEnv;
    }

    protected getDockerShellCommand(instructions: string, _fileList?: import('../types').FileList): string {
        return `opencode run -m ${this.config.model} '${escapeShellArg(instructions)}'`;
    }

    async buildLocalCommand(_exercisePath: string, instructions: string, _fileList?: import('../types').FileList): Promise<string[]> {
        return [
            "opencode", "run",
            "-m", this.config.model,
            instructions
        ];
    }
} 
