import type { AgentBuilder, AgentConfig } from '../types';
import { BaseAgentBuilder } from '../base';

export class AiderAgentBuilder extends BaseAgentBuilder implements AgentBuilder {
    constructor(agentConfig: AgentConfig) {
        super(agentConfig);
    }

    protected getEnvironmentVariables(): Record<string, string> {
        return {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
            GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "",
            GEMINI_API_KEY: process.env.GOOGLE_API_KEY || "",
            AIDER_GIT: 'false',
            AIDER_AUTO_COMMITS: 'false',
            AIDER_SHOW_RELEASE_NOTES: 'false',
            AIDER_SKIP_SANITY_CHECK_REPO: 'true',
            AIDER_CHAT_HISTORY_FILE: '/dev/null',
            AIDER_INPUT_HISTORY_FILE: '/dev/null'
        };
    }

    protected getCoreArgs(instructions: string, fileList?: import('../types').FileList): string[] {
        const sourceFiles = fileList?.sourceFiles || [];
        const testFiles = fileList?.testFiles || [];
        
        const args: string[] = [
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
