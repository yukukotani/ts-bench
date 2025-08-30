import { describe, expect, it } from 'bun:test';
import { ClaudeAgentBuilder } from '../claude';

describe('ClaudeAgentBuilder', () => {
    const config = {
        model: 'claude-3-sonnet',
        containerName: 'test-container'
    };

    it('should build correct command for Claude agent', async () => {
        const builder = new ClaudeAgentBuilder(config);
        const args = await builder.build('/path/to/exercise', 'Test instructions');

        expect(args).toContain('docker');
        expect(args).toContain('run');
        expect(args).toContain('-e');
        expect(args).toContain('ANTHROPIC_API_KEY');
        expect(args).toContain('test-container');
        expect(args.join(' ')).toContain('claude-3-sonnet');
    });

    it('should escape shell arguments properly', async () => {
        const builder = new ClaudeAgentBuilder(config);
        const instructions = "Test with 'quotes'";
        const args = await builder.build('/path/to/exercise', instructions);
        
        const shellCommand = args[args.length - 1];
        expect(shellCommand).toContain("'\"'\"'");
    });

    it('should include workspace volume mount', async () => {
        const builder = new ClaudeAgentBuilder(config);
        const args = await builder.build('/test/exercise', 'Instructions');
        
        const volumeMount = args.find(arg => arg.includes('/test/exercise:/workspace'));
        expect(volumeMount).toBeDefined();
    });
});