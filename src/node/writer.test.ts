import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeGeneratedProject } from './writer.js';
import { PackkitCoreError } from '../errors.js';

const dirs: string[] = [];
const tmp = () => {
	const d = mkdtempSync(join(tmpdir(), 'packkit-core-'));
	dirs.push(d);
	return d;
};
afterEach(() => {
	for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('writeGeneratedProject', () => {
	it('writes a file map, creating directories', () => {
		const dir = tmp();
		const { written } = writeGeneratedProject(dir, { 'src/a.txt': 'A', 'README.md': 'hi' });
		expect(written).toEqual(['README.md', 'src/a.txt']);
		expect(readFileSync(join(dir, 'src/a.txt'), 'utf8')).toBe('A');
	});

	it('skips existing files unless force is set', () => {
		const dir = tmp();
		writeFileSync(join(dir, 'keep.txt'), 'original');
		const first = writeGeneratedProject(dir, { 'keep.txt': 'new' });
		expect(first.skipped).toEqual(['keep.txt']);
		expect(readFileSync(join(dir, 'keep.txt'), 'utf8')).toBe('original');

		writeGeneratedProject(dir, { 'keep.txt': 'new' }, { force: true });
		expect(readFileSync(join(dir, 'keep.txt'), 'utf8')).toBe('new');
	});

	it('refuses to write outside the target directory', () => {
		const dir = tmp();
		expect(() => writeGeneratedProject(dir, { '../escape.txt': 'x' })).toThrow(PackkitCoreError);
		expect(existsSync(join(dir, '..', 'escape.txt'))).toBe(false);
	});
});
