import type { AgentBuilder, AgentConfig, FileList } from '../types';
import { escapeShellArg } from '../../utils/shell';
import { BaseAgentBuilder } from '../../utils/docker';

export class CursorAgentBuilder extends BaseAgentBuilder implements AgentBuilder {
    constructor(agentConfig: AgentConfig) {
        super(agentConfig);
    }

    protected getEnvironmentVariables(): Record<string, string> {
        // Cursor CLI は CURSOR_API_KEY を参照
        return {
            CURSOR_API_KEY: process.env.CURSOR_API_KEY || ""
        };
    }

    protected getDockerShellCommand(instructions: string, fileList?: FileList): string {
        const sourceFiles = fileList?.sourceFiles || [];
        const fileArgs = sourceFiles.map(f => `'${f}'`).join(' ');

        // 正しい CLI とモデル引数を使用
        const base = `cursor-agent --model ${this.config.model} -p '${escapeShellArg(instructions)}'`;
        return fileArgs ? `${base} ${fileArgs}` : base;
    }

    async buildLocalCommand(_exercisePath: string, instructions: string, fileList?: FileList): Promise<string[]> {
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

