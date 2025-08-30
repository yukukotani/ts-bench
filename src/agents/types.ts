export interface AgentBuilder {
    build(exercisePath: string, instructions: string, useDocker?: boolean, fileList?: FileList): Promise<string[]>;
    buildDockerCommand(exercisePath: string, instructions: string, fileList?: FileList): Promise<string[]>;
    buildLocalCommand(exercisePath: string, instructions: string, fileList?: FileList): Promise<string[]>;
}

export interface FileList {
    sourceFiles: string[];
    testFiles: string[];
}

export interface AgentConfig {
    model: string;
    provider?: string;
    containerName: string;
}