import type { AgentBuilder, AgentConfig } from '../types';
import { BaseAgentBuilder } from '../base';

export class CodexAgentBuilder extends BaseAgentBuilder implements AgentBuilder {
    constructor(agentConfig: AgentConfig) {
        super(agentConfig);
    }

    protected getEnvironmentVariables(): Record<string, string> {
        return {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
            OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || ""
        };
    }

    protected getCoreArgs(instructions: string): string[] {
        return [
            'codex', 'exec',
            '-c', 'model_reasoning_effort=high',
            '-c', `model_provider=${this.config.provider || 'openai'}`,
            '--full-auto',
            '--skip-git-repo-check',
            '-m', this.config.model,
            instructions
        ];
    }
}
