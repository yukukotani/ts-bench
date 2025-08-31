export const DOCKER_BASE_ARGS = ["docker", "run", "--rm", "-i"] as const;

export interface DockerWorkspaceOptions {
  workspacePath: string;
  workingDir?: string;
}

export function createWorkspaceArgs(options: DockerWorkspaceOptions): string[] {
  const { workspacePath, workingDir = "/workspace" } = options;
  return [
    "-v", `${workspacePath}:${workingDir}`,
    "-w", workingDir
  ];
}

export function createEnvironmentArgs(envVars: Record<string, string>): string[] {
  return Object.entries(envVars)
    // Security hardening: only pass variables that have explicit values set
    // Avoid implicit host env pass-through with `-e KEY` which can leak secrets unexpectedly
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .flatMap(([key, value]) => ["-e", `${key}=${value}`]);
}
