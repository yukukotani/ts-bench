import type { AgentBuilder, AgentConfig } from '../types';
import { escapeShellArg } from '../../utils/shell';
import { BaseAgentBuilder } from '../../utils/docker';

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

    protected getDockerShellCommand(instructions: string, _fileList?: import('../types').FileList): string {
        return `echo '${escapeShellArg(instructions)}' | gemini --model ${this.config.model} -y -p`;
    }

    async buildLocalCommand(_exercisePath: string, instructions: string, _fileList?: import('../types').FileList): Promise<string[]> {
        return [
            "sh", "-c",
            `echo '${escapeShellArg(instructions)}' | gemini --model ${this.config.model} -y -p`
        ];
    }
}