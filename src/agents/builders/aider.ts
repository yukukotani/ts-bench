import type { AgentBuilder, AgentConfig } from '../types';
import { escapeShellArg } from '../../utils/shell';
import { BaseAgentBuilder } from '../../utils/docker';

export class AiderAgentBuilder extends BaseAgentBuilder implements AgentBuilder {
    constructor(agentConfig: AgentConfig) {
        super(agentConfig);
    }

    protected getEnvironmentVariables(): Record<string, string> {
        return {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
            GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "",
            GEMINI_API_KEY: process.env.GOOGLE_API_KEY || ""
        };
    }

    protected getDockerShellCommand(instructions: string, fileList?: import('../types').FileList): string {
        const sourceFiles = fileList?.sourceFiles || [];
        const testFiles = fileList?.testFiles || [];
        
        const fileArgs = sourceFiles.length > 0 
            ? sourceFiles.map(f => `--file "${f}"`).join(' ')
            : '--file "*.ts"';
            
        const readArgs = testFiles.length > 0 
            ? testFiles.map(f => `--read "${f}"`).join(' ')
            : '--read "*.test.ts"';
        
        return `aider --yes-always --no-auto-commits --model ${this.config.model} --message '${escapeShellArg(instructions)}' ${fileArgs} ${readArgs}`;
    }

    async buildLocalCommand(_exercisePath: string, instructions: string, fileList?: import('../types').FileList): Promise<string[]> {
        const sourceFiles = fileList?.sourceFiles || [];
        const testFiles = fileList?.testFiles || [];
        
        const args = [
            "aider", 
            "--yes-always",
            "--no-auto-commits", 
            "--model", this.config.model
        ];
        
        if (sourceFiles.length > 0) {
            sourceFiles.forEach(file => {
                args.push("--file", file);
            });
        } else {
            args.push("--file", "*.ts");
        }
        
        if (testFiles.length > 0) {
            testFiles.forEach(file => {
                args.push("--read", file);
            });
        } else {
            args.push("--read", "*.test.ts");
        }

        args.push("--message", instructions);
        
        return args;
    }
}