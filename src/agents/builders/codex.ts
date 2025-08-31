import type { AgentBuilder, AgentConfig } from '../types';
import { BaseAgentBuilder } from '../base';

export class CodexAgentBuilder extends BaseAgentBuilder implements AgentBuilder {
    constructor(agentConfig: AgentConfig) {
        super(agentConfig);
    }

    protected getEnvironmentVariables(): Record<string, string> {
        return {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
            CODEX_RUST: '1'
        };
    }

    protected getCoreArgs(instructions: string): string[] {
        return [
            'codex', 'exec',
            '-c', 'model_reasoning_effort=high',
            '--full-auto',
            '--skip-git-repo-check',
            '-m', this.config.model,
            instructions
        ];
    }
}
