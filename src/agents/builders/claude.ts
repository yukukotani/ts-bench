import type { AgentBuilder, AgentConfig } from '../types';
import { BaseAgentBuilder } from '../base';

export class ClaudeAgentBuilder extends BaseAgentBuilder implements AgentBuilder {
    constructor(agentConfig: AgentConfig) {
        super(agentConfig);
    }

    protected getEnvironmentVariables(): Record<string, string> {
        const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.DASHSCOPE_API_KEY || "";
        const env: Record<string, string> = {
            ANTHROPIC_API_KEY: anthropicKey
        };
        // Support dashscope provider custom base URL & auth token
        if (this.config.provider === 'dashscope') {
            env.ANTHROPIC_AUTH_TOKEN = process.env.DASHSCOPE_API_KEY || anthropicKey || '';
            env.ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://dashscope-intl.aliyuncs.com/api/v2/apps/claude-code-proxy';
        }
        // Support deepseek provider (Anthropic-compatible API)
        if (this.config.provider === 'deepseek') {
            env.ANTHROPIC_AUTH_TOKEN = process.env.DEEPSEEK_API_KEY || '';
            env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/anthropic';
        }
        return env;
    }

    protected getCoreArgs(instructions: string): string[] {
        return [
            'claude',
            '--dangerously-skip-permissions',
            '--model', this.config.model,
            '-p', instructions
        ];
    }
}
