import { describe, it, expect } from 'vitest';
import { runProviderConformanceSuite } from './provider-conformance.js';
import type { ProviderConformanceHarness } from './provider-conformance.js';
import type { PackkitProvider } from '../provider.js';

// A reference provider that satisfies the contract — proves the suite passes a correct
// provider (and, by inversion below, that it catches violations).
const referenceProvider: PackkitProvider = {
	id: 'reference',
	capabilities: ['plan', 'apply'],
	supports(contract) {
		const type = (contract as { type?: string } | undefined)?.type;
		if (type === 'static') return { supported: true, reasons: [] };
		return {
			supported: false,
			reasons: [{ code: 'UNSUPPORTED', message: `no support for '${type}'` }],
		};
	},
	plan(input) {
		const { name } = (input as { name?: string }) ?? {};
		return { provider: 'reference', schemaVersion: 1, name: name ?? 'app', resources: ['bucket'] };
	},
	apply() {
		return { status: 'applied' };
	},
};

const harness: ProviderConformanceHarness = {
	provider: referenceProvider,
	supportedContract: { type: 'static', buildCommand: 'build', outputDirectory: 'dist' },
	unsupportedContract: { type: 'worker' },
	planInput: () => ({ name: 'app' }),
	secrets: ['sk-super-secret'],
};

describe('a correct provider passes runProviderConformanceSuite', () => {
	runProviderConformanceSuite(harness, (name, fn) => it(name, fn));
});

describe('the suite catches violations', () => {
	it('rejects a provider whose plan omits a schema version', () => {
		const bad = {
			...referenceProvider,
			plan: () => ({ provider: 'reference' }),
		} as unknown as PackkitProvider;
		expect(() => runProviderConformanceSuite({ ...harness, provider: bad })).toThrow(
			/schemaVersion/,
		);
	});

	it("rejects a provider that advertises 'apply' but has none", () => {
		const bad = { ...referenceProvider, apply: undefined } as PackkitProvider;
		expect(() => runProviderConformanceSuite({ ...harness, provider: bad })).toThrow(/apply/);
	});

	it('rejects a plan that leaks a declared secret', () => {
		const leaky = {
			...referenceProvider,
			plan: () => ({ provider: 'reference', schemaVersion: 1, token: 'sk-super-secret' }),
		} as PackkitProvider;
		expect(() => runProviderConformanceSuite({ ...harness, provider: leaky })).toThrow(/secret/);
	});
});
