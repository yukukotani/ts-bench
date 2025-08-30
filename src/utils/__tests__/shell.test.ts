import { describe, expect, it } from 'bun:test';
import { escapeShellArg } from '../shell';

describe('escapeShellArg', () => {
    it('should escape single quotes', () => {
        const input = "Test with 'single quotes'";
        const result = escapeShellArg(input);
        expect(result).toBe("Test with '\"'\"'single quotes'\"'\"'");
    });

    it('should handle strings without quotes', () => {
        const input = "Test without quotes";
        const result = escapeShellArg(input);
        expect(result).toBe("Test without quotes");
    });

    it('should handle empty string', () => {
        const input = "";
        const result = escapeShellArg(input);
        expect(result).toBe("");
    });

    it('should handle multiple single quotes', () => {
        const input = "Test 'with' 'multiple' 'quotes'";
        const result = escapeShellArg(input);
        expect(result).toBe("Test '\"'\"'with'\"'\"' '\"'\"'multiple'\"'\"' '\"'\"'quotes'\"'\"'");
    });
});