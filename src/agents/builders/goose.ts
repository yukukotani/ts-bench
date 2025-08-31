import type { AgentBuilder, AgentConfig } from '../types';
import { BaseAgentBuilder } from '../base';

export class GooseAgentBuilder extends BaseAgentBuilder implements AgentBuilder {
    constructor(agentConfig: AgentConfig) {
        super(agentConfig);
    }

    protected getEnvironmentVariables(): Record<string, string> {
        return {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
            GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "",
            GOOSE_MODEL: this.config.model,
            GOOSE_PROVIDER: this.config.provider || "anthropic",
            GOOSE_DISABLE_KEYRING: "1"
        };
    }

    protected getCoreArgs(instructions: string): string[] {
        return [
            'goose', 'run',
            '--with-builtin', 'developer',
            '--text', instructions
        ];
    }
}
