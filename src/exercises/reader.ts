import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export class ExerciseReader {
    constructor(private basePath: string) {}

    async getExercises(): Promise<string[]> {
        const practiceDir = join(process.cwd(), this.basePath, 'exercises', 'practice');
        const entries = await readdir(practiceDir, { withFileTypes: true });
        
        return entries
            .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
            .map(entry => entry.name)
            .sort();
    }

    async getTestFiles(exerciseName: string): Promise<string[]> {
        try {
            const exerciseDir = join(process.cwd(), this.basePath, 'exercises', 'practice', exerciseName);
            const entries = await readdir(exerciseDir);
            
            // Generic test file patterns
            const testPatterns = [
                /\.test\./,     // .test.js, .test.ts, .test.py, etc.
                /_test\./,      // _test.js, _test.py, etc.
                /\.spec\./,     // .spec.js, .spec.ts, etc.
                /_spec\./,      // _spec.js, _spec.py, etc.
                /test_.*\.py$/, // test_*.py (Python)
                /.*_test\.py$/, // *_test.py (Python)
                /.*Test\./,     // *Test.java (Java)
                /Test.*\./,     // Test*.java (Java)
            ];
            
            return entries.filter(file => 
                testPatterns.some(pattern => pattern.test(file))
            );
        } catch (error) {
            console.warn(`Warning: Could not read test files from ${exerciseName}`);
            return [];
        }
    }

    async getSourceFiles(exerciseName: string): Promise<string[]> {
        try {
            const exerciseDir = join(process.cwd(), this.basePath, 'exercises', 'practice', exerciseName);
            const entries = await readdir(exerciseDir);
            
            // Implementation file patterns (TypeScript focused)
            const sourcePatterns = [
                /\.ts$/,        // .ts files
                /\.js$/,        // .js files  
                /\.jsx$/,       // .jsx files
                /\.tsx$/,       // .tsx files
            ];
            
            // Exclude test files
            const testPatterns = [
                /\.test\./,
                /_test\./,
                /\.spec\./,
                /_spec\./,
            ];
            
            return entries.filter(file => 
                sourcePatterns.some(pattern => pattern.test(file)) &&
                !testPatterns.some(pattern => pattern.test(file))
            );
        } catch (error) {
            console.warn(`Warning: Could not read source files from ${exerciseName}`);
            return [];
        }
    }

    async getFileList(exerciseName: string): Promise<{ sourceFiles: string[], testFiles: string[] }> {
        const [sourceFiles, testFiles] = await Promise.all([
            this.getSourceFiles(exerciseName),
            this.getTestFiles(exerciseName)
        ]);
        
        return { sourceFiles, testFiles };
    }

    async getInstructions(exerciseName: string, baseInstruction: string, customInstruction?: string): Promise<string> {
        try {
            const environment = await readFile(join(process.cwd(), this.basePath, "CLAUDE.md"), "utf-8");
            const instructionsPath = join(process.cwd(), this.basePath, 'exercises', 'practice', exerciseName, '.docs', 'instructions.md');
            const exerciseInstructions = await readFile(instructionsPath, 'utf-8');
            
            let fullInstructions = `${baseInstruction}\n\n${exerciseInstructions}\n\n${environment}`;
            
            if (customInstruction) {
                fullInstructions += `\n\n${customInstruction}`;
            }
            
            return fullInstructions;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to read exercise instructions for ${exerciseName}: ${errorMsg}`);
        }
    }
}