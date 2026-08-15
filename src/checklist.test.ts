import { describe, it, expect } from 'vitest';
import {
	GENERATOR_CHECKLIST,
	GENERATOR_CHECKLIST_IDS,
	type ChecklistCategory,
	type ChecklistScope,
} from './checklist.js';

const CATEGORIES: ChecklistCategory[] = [
	'source',
	'quality',
	'docs',
	'repo',
	'ci',
	'release',
	'deploy',
	'protocol',
];
const SCOPES: ChecklistScope[] = ['all', 'deployable', 'containerizable', 'publishable'];

describe('GENERATOR_CHECKLIST', () => {
	it('has unique, non-empty ids', () => {
		const ids = GENERATOR_CHECKLIST.map((i) => i.id);
		expect(ids.every((id) => id.length > 0)).toBe(true);
		expect(new Set(ids).size).toBe(ids.length);
		expect(GENERATOR_CHECKLIST_IDS).toEqual(ids);
	});

	it('every item is fully specified (title, valid category/scope, description, all three realizations)', () => {
		for (const item of GENERATOR_CHECKLIST) {
			expect(item.title.length, item.id).toBeGreaterThan(0);
			expect(item.description.length, item.id).toBeGreaterThan(0);
			expect(CATEGORIES, item.id).toContain(item.category);
			expect(SCOPES, item.id).toContain(item.scope);
			// Every capability must state how each current language realizes it — the guard
			// against a language quietly becoming an afterthought.
			for (const lang of ['js', 'python', 'go'] as const) {
				expect(item.realizations[lang]?.length, `${item.id}.${lang}`).toBeGreaterThan(0);
			}
		}
	});

	it('covers the non-negotiable capabilities', () => {
		for (const id of [
			'tests',
			'lint-format',
			'license',
			'ci',
			'community',
			'release',
			'conformance',
		]) {
			expect(GENERATOR_CHECKLIST_IDS, id).toContain(id);
		}
	});
});
