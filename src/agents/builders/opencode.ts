import type { AgentBuilder, AgentConfig } from '../types';
import { BaseAgentBuilder } from '../base';

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

    protected getCoreArgs(instructions: string): string[] {
        return [
            'opencode', 'run',
            '-m', this.config.model,
            instructions
        ];
    }
} 
