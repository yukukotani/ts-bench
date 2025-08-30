import type { AgentBuilder, AgentConfig } from '../types';
import { escapeShellArg } from '../../utils/shell';
import { BaseAgentBuilder } from '../../utils/docker';

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
        return env;
    }

    protected getDockerShellCommand(instructions: string, _fileList?: import('../types').FileList): string {
        return `claude --dangerously-skip-permissions --model ${this.config.model} -p '${escapeShellArg(instructions)}'`;
    }

    async buildLocalCommand(_exercisePath: string, instructions: string, _fileList?: import('../types').FileList): Promise<string[]> {
        const args = [
            "claude",
            "--dangerously-skip-permissions",
            "--model", this.config.model,
            "-p", instructions
        ];
        return args;
    }
}