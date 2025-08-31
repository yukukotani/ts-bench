import type { AgentBuilder, AgentConfig } from '../types';
import { escapeShellArg } from '../../utils/shell';
import { BaseAgentBuilder } from '../../utils/docker';

export class QwenAgentBuilder extends BaseAgentBuilder implements AgentBuilder {
    constructor(agentConfig: AgentConfig) {
        super(agentConfig);
    }

    protected getEnvironmentVariables(): Record<string, string> {
        return {}
    }

    protected getDockerShellCommand(instructions: string, _fileList?: import('../types').FileList): string {
        return `qwen -y -m ${this.config.model} -p '${escapeShellArg(instructions)}'`;
    }

    async buildLocalCommand(_exercisePath: string, instructions: string, _fileList?: import('../types').FileList): Promise<string[]> {
        return [
            "qwen",
            "--debug",
            "-y",
            "-p", escapeShellArg(instructions)
        ];
    }
} 