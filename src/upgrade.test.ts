import { describe, it, expect } from 'vitest';
import { computeProjectUpgrade, summarizeFileUpgrade } from './upgrade.js';
import { contentHash } from './hash.js';

const hashesOf = (files: Record<string, string>) =>
	Object.fromEntries(Object.entries(files).map(([p, c]) => [p, { hash: contentHash(c) }]));

describe('computeProjectUpgrade', () => {
	it('classifies a clean re-generation as all unchanged', () => {
		const files = { 'a.txt': '1', 'b.txt': '2' };
		const { plan, patch } = computeProjectUpgrade({
			generatedFiles: files,
			currentFiles: files,
			baselineFileHashes: hashesOf(files),
		});
		expect(plan.files.every((f) => f.status === 'unchanged')).toBe(true);
		expect(Object.keys(patch)).toHaveLength(0);
	});

	it('applies a template-only change but preserves a user edit', () => {
		const baseFiles = { 'keep.txt': 'orig', 'tmpl.txt': 'v1' };
		const baseline = hashesOf(baseFiles);
		// user edited keep.txt; template bumped tmpl.txt
		const current = { 'keep.txt': 'user-edit', 'tmpl.txt': 'v1' };
		const generated = { 'keep.txt': 'orig', 'tmpl.txt': 'v2' };
		const { plan, patch } = computeProjectUpgrade({
			generatedFiles: generated,
			currentFiles: current,
			baselineFileHashes: baseline,
		});
		const byPath = Object.fromEntries(plan.files.map((f) => [f.path, f]));
		expect(byPath['tmpl.txt']?.status).toBe('template-only-change');
		expect(byPath['tmpl.txt']?.safeToApply).toBe(true);
		expect(patch['tmpl.txt']).toBe('v2');
		expect(byPath['keep.txt']?.status).toBe('user-only-change');
		expect(patch['keep.txt']).toBeUndefined(); // user edit preserved
	});

	it('flags both-changed as a conflict', () => {
		const baseline = hashesOf({ 'f.txt': 'base' });
		const { plan } = computeProjectUpgrade({
			generatedFiles: { 'f.txt': 'template-new' },
			currentFiles: { 'f.txt': 'user-new' },
			baselineFileHashes: baseline,
		});
		expect(plan.files[0]?.status).toBe('both-changed');
		expect(summarizeFileUpgrade(plan).conflicts).toBe(1);
	});

	it('marks a file absent on disk as new-generated (safe to add)', () => {
		const { plan, patch } = computeProjectUpgrade({
			generatedFiles: { 'new.txt': 'x' },
			currentFiles: {},
			baselineFileHashes: {},
		});
		expect(plan.files[0]?.status).toBe('new-generated');
		expect(patch['new.txt']).toBe('x');
	});

	it('reports a baseline file no longer generated as removed-from-template', () => {
		const { plan } = computeProjectUpgrade({
			generatedFiles: {},
			currentFiles: { 'gone.txt': 'still here' },
			baselineFileHashes: { 'gone.txt': { hash: contentHash('still here') } },
		});
		expect(plan.files.find((f) => f.path === 'gone.txt')?.status).toBe('removed-from-template');
	});

	it('without a baseline, a divergence is an ambiguous changed (not auto-applied)', () => {
		const { plan, patch } = computeProjectUpgrade({
			generatedFiles: { 'f.txt': 'new' },
			currentFiles: { 'f.txt': 'old' },
		});
		expect(plan.baselineAvailable).toBe(false);
		expect(plan.files[0]?.status).toBe('changed');
		expect(patch['f.txt']).toBeUndefined();
	});
});
