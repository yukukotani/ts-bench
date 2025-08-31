import type { AgentBuilder, AgentConfig, FileList } from '../types';
import { BaseAgentBuilder } from '../base';

export class CursorAgentBuilder extends BaseAgentBuilder implements AgentBuilder {
    constructor(agentConfig: AgentConfig) {
        super(agentConfig);
    }

    protected getEnvironmentVariables(): Record<string, string> {
        return {
            CURSOR_API_KEY: process.env.CURSOR_API_KEY || ""
        };
    }

    protected getCoreArgs(instructions: string, fileList?: FileList): string[] {
        const sourceFiles = fileList?.sourceFiles || [];

        const args = [
            'cursor-agent',
            '--model',
            this.config.model,
            '-p',
            instructions
        ];

        if (sourceFiles.length > 0) {
            args.push(...sourceFiles);
        }

        return args;
    }
}
