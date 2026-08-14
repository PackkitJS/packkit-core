import { describe, it, expect } from 'vitest';
import { calculateGeneratedProjectDigest } from './digest.js';

const project = (config: Record<string, unknown>, files: Record<string, string>) => ({
	config,
	files,
});

describe('calculateGeneratedProjectDigest', () => {
	it('is deterministic for the same config + files', () => {
		const a = project(
			{ name: 'x', target: 'lib' },
			{ 'README.md': 'hi', 'src/index.ts': 'export {}' },
		);
		const b = project(
			{ name: 'x', target: 'lib' },
			{ 'README.md': 'hi', 'src/index.ts': 'export {}' },
		);
		expect(calculateGeneratedProjectDigest(a)).toBe(calculateGeneratedProjectDigest(b));
	});

	it('is independent of file enumeration order', () => {
		const a = project({ name: 'x' }, { 'a.txt': '1', 'b.txt': '2', 'c.txt': '3' });
		const b = project({ name: 'x' }, { 'c.txt': '3', 'a.txt': '1', 'b.txt': '2' });
		expect(calculateGeneratedProjectDigest(a)).toBe(calculateGeneratedProjectDigest(b));
	});

	it('is independent of config key order', () => {
		const a = project({ name: 'x', target: 'cli', license: 'MIT' }, { f: '1' });
		const b = project({ license: 'MIT', target: 'cli', name: 'x' }, { f: '1' });
		expect(calculateGeneratedProjectDigest(a)).toBe(calculateGeneratedProjectDigest(b));
	});

	it('changes when a file changes', () => {
		const a = project({ name: 'x' }, { f: 'one' });
		const b = project({ name: 'x' }, { f: 'two' });
		expect(calculateGeneratedProjectDigest(a)).not.toBe(calculateGeneratedProjectDigest(b));
	});

	it('changes when config changes', () => {
		const a = project({ name: 'x', target: 'lib' }, { f: '1' });
		const b = project({ name: 'x', target: 'cli' }, { f: '1' });
		expect(calculateGeneratedProjectDigest(a)).not.toBe(calculateGeneratedProjectDigest(b));
	});

	it('does not confuse a path change for a content change (separators are unambiguous)', () => {
		// Same bytes, different split between path and content must differ.
		const a = project({}, { ab: 'c' });
		const b = project({}, { a: 'bc' });
		expect(calculateGeneratedProjectDigest(a)).not.toBe(calculateGeneratedProjectDigest(b));
	});
});
