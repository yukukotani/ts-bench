import { spawn } from "bun";

export function escapeShellArg(str: string): string {
    return str.replace(/'/g, "'\"'\"'");
}

export interface ExecuteOptions {
    cwd?: string;
    env?: Record<string, string>;
}

export interface CommandExecutor {
    execute(args: string[], options?: ExecuteOptions): Promise<CommandResult>;
}

export interface CommandResult {
    exitCode: number | null;
    stdout: string;
    stderr: string;
}

export class BunCommandExecutor implements CommandExecutor {
    async execute(args: string[], options?: ExecuteOptions): Promise<CommandResult> {
        const spawnOptions: any = {};
        
        if (options?.cwd) {
            spawnOptions.cwd = options.cwd;
        }
        
        if (options?.env) {
            spawnOptions.env = { ...process.env, ...options.env };
        }

        const proc = spawn(args, spawnOptions);
        await proc.exited;
        
        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        
        return {
            exitCode: proc.exitCode,
            stdout: this.filterYarnNoise(stdout),
            stderr: this.filterYarnNoise(stderr)
        };
    }

    private filterYarnNoise(text: string): string {
        return text.replace(/YN0000.*\n/g, '');
    }
}