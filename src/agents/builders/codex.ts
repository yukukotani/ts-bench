import type { AgentBuilder, AgentConfig } from '../types';
import { escapeShellArg } from '../../utils/shell';
import { BaseAgentBuilder } from '../../utils/docker';

export class CodexAgentBuilder extends BaseAgentBuilder implements AgentBuilder {
    constructor(agentConfig: AgentConfig) {
        super(agentConfig);
    }

    protected getEnvironmentVariables(): Record<string, string> {
        return {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || "", 
        };
    }

    protected getDockerShellCommand(instructions: string, _fileList?: import('../types').FileList): string {
        return `codex exec --full-auto --skip-git-repo-check -m ${this.config.model} '${escapeShellArg(instructions)}'`;
    }

    async buildLocalCommand(_exercisePath: string, instructions: string, _fileList?: import('../types').FileList): Promise<string[]> {
        return [
            "codex", "exec",
            "-c", "model_reasoning_effort=high",
            "--full-auto",
            "--skip-git-repo-check",
            "-m", this.config.model,
            instructions
        ];
    }
}