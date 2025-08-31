import type { AgentBuilder, AgentConfig } from '../types';
import { BaseAgentBuilder } from '../base';

export class GeminiAgentBuilder extends BaseAgentBuilder implements AgentBuilder {
    constructor(agentConfig: AgentConfig) {
        super(agentConfig);
    }

    protected getEnvironmentVariables(): Record<string, string> {
        return {
            GEMINI_API_KEY:  process.env.GEMINI_API_KEY || '',
            GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || ''
        };
    }

    protected getCoreArgs(instructions: string): string[] {
        return [
            'gemini',
            '--model', this.config.model,
            '-y',
            '-p', instructions
        ];
    }
}
