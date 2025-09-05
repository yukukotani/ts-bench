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
        
        switch (this.config.provider) {
            case 'dashscope':
            env.ANTHROPIC_AUTH_TOKEN = process.env.DASHSCOPE_API_KEY || anthropicKey || '';
            env.ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://dashscope-intl.aliyuncs.com/api/v2/apps/claude-code-proxy';
            break;
            case 'deepseek':
            env.ANTHROPIC_AUTH_TOKEN = process.env.DEEPSEEK_API_KEY || '';
            env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/anthropic';
            break;
            case 'moonshot':
            env.ANTHROPIC_AUTH_TOKEN = process.env.MOONSHOT_API_KEY || '';
            env.ANTHROPIC_BASE_URL = 'https://api.moonshot.ai/anthropic';
            break;
            case 'zai':
            env.ANTHROPIC_AUTH_TOKEN = process.env.ZAI_API_KEY || '';
            env.ANTHROPIC_BASE_URL = 'https://api.z.ai/api/anthropic';
            break;
        }

        return env;
    }

    protected getCoreArgs(instructions: string): string[] {
        return [
            'claude',
            '--debug',
            '--verbose',
            '--dangerously-skip-permissions',
            '--model', this.config.model,
            '-p', instructions
        ];
    }
}
