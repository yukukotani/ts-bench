import { describe, expect, it } from 'bun:test';
import { formatDuration } from '../duration';

describe('formatDuration', () => {
    it('should format milliseconds', () => {
        expect(formatDuration(500)).toBe('500ms');
        expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds', () => {
        expect(formatDuration(1000)).toBe('1.0s');
        expect(formatDuration(1500)).toBe('1.5s');
        expect(formatDuration(2000)).toBe('2.0s');
    });

    it('should handle zero', () => {
        expect(formatDuration(0)).toBe('0ms');
    });

    it('should handle large values', () => {
        expect(formatDuration(10000)).toBe('10.0s');
        expect(formatDuration(60000)).toBe('60.0s');
    });
});