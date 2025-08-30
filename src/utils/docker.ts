/**
 * Docker utility functions and constants for agent execution
 */

export const DOCKER_BASE_ARGS = ["docker", "run", "--rm", "-i"] as const;

export interface DockerWorkspaceOptions {
  workspacePath: string;
  workingDir?: string;
}

/**
 * Creates Docker arguments for workspace mounting and working directory
 */
export function createWorkspaceArgs(options: DockerWorkspaceOptions): string[] {
  const { workspacePath, workingDir = "/workspace" } = options;
  return [
    "-v", `${workspacePath}:${workingDir}`,
    "-w", workingDir
  ];
}

/**
 * Creates Docker arguments with environment variables
 */
export function createEnvironmentArgs(envVars: Record<string, string>): string[] {
  return Object.entries(envVars)
    // Security hardening: only pass variables that have explicit values set
    // Avoid implicit host env pass-through with `-e KEY` which can leak secrets unexpectedly
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .flatMap(([key, value]) => ["-e", `${key}=${value}`]);
}

/**
 * Base agent builder with common Docker/local command patterns
 */
export abstract class BaseAgentBuilder {
  constructor(protected config: { containerName: string; model: string; provider?: string }) {}

  async build(exercisePath: string, instructions: string, useDocker: boolean = true, fileList?: import('../agents/types').FileList): Promise<string[]> {
    return useDocker 
      ? this.buildDockerCommand(exercisePath, instructions, fileList)
      : this.buildLocalCommand(exercisePath, instructions, fileList);
  }

  async buildDockerCommand(exercisePath: string, instructions: string, fileList?: import('../agents/types').FileList): Promise<string[]> {
    const workspacePath = join(process.cwd(), exercisePath);
    const envVars = this.getEnvironmentVariables();
    
    return [
      ...DOCKER_BASE_ARGS,
      ...createEnvironmentArgs(envVars),
      ...createWorkspaceArgs({ workspacePath }),
      this.config.containerName,
      "sh", "-c",
      this.getDockerShellCommand(instructions, fileList)
    ];
  }

  protected abstract getEnvironmentVariables(): Record<string, string>;
  protected abstract getDockerShellCommand(instructions: string, fileList?: import('../agents/types').FileList): string;
  abstract buildLocalCommand(exercisePath: string, instructions: string, fileList?: import('../agents/types').FileList): Promise<string[]>;
}

// Re-export join for convenience
import { join } from 'path';
