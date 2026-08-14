import { describe, it, expect } from 'vitest';
import type { Diagnostic } from './diagnostics.js';
import { extendGeneratedProject } from './extend.js';

const base = (): { files: Record<string, string>; diagnostics: Diagnostic[] } => ({
	files: { 'README.md': 'gen', 'src/index.ts': 'export {}' },
	diagnostics: [],
});

describe('extendGeneratedProject', () => {
	it('adds a new file and records add provenance', () => {
		const { project, extension, diagnostics } = extendGeneratedProject(base(), {
			files: { '.platform/app.json': { mode: 'add', content: '{}' } },
		});
		expect(project.files['.platform/app.json']).toBe('{}');
		expect(extension.files['.platform/app.json']).toEqual({ mode: 'add', content: '{}' });
		expect(diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
	});

	it('replaces a generated file and records replace provenance', () => {
		const { project, extension } = extendGeneratedProject(base(), {
			files: { 'README.md': { mode: 'replace', content: 'host' } },
		});
		expect(project.files['README.md']).toBe('host');
		expect(extension.files['README.md']?.mode).toBe('replace');
	});

	it('reports a collision when add targets a generated file and does not clobber it', () => {
		const { project, diagnostics } = extendGeneratedProject(base(), {
			files: { 'README.md': { mode: 'add', content: 'host' } },
		});
		expect(project.files['README.md']).toBe('gen'); // untouched
		expect(diagnostics.some((d) => d.code === 'EXTENSION_FILE_COLLISION')).toBe(true);
	});

	it('reports an unsafe path and skips it', () => {
		const { project, diagnostics } = extendGeneratedProject(base(), {
			files: { '../escape': { mode: 'add', content: 'x' } },
		});
		expect(Object.keys(project.files)).not.toContain('../escape');
		expect(diagnostics.some((d) => d.code === 'UNSAFE_EXTENSION_PATH')).toBe(true);
	});

	it('replace on a non-existent path adds it with an info diagnostic', () => {
		const { project, diagnostics } = extendGeneratedProject(base(), {
			files: { 'new.txt': { mode: 'replace', content: 'x' } },
		});
		expect(project.files['new.txt']).toBe('x');
		expect(diagnostics.some((d) => d.code === 'EXTENSION_REPLACE_ADDED')).toBe(true);
	});

	it('rejects non-string content', () => {
		const { diagnostics } = extendGeneratedProject(base(), {
			// @ts-expect-error intentional bad input
			files: { x: { mode: 'add', content: 42 } },
		});
		expect(diagnostics.some((d) => d.code === 'INVALID_EXTENSION_FILE')).toBe(true);
	});
});
