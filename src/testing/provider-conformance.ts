// The executable definition of "a Packkit provider". Both provider-netlify (API-driven)
// and provider-aws (IaC-emitting) run the same suite. Because providers don't share a
// single plan-input shape the way generators share createProject, the suite takes a
// small HARNESS that supplies a supported/unsupported contract and a valid plan input;
// everything else is checked generically. Framework-agnostic: checks throw on failure.
import type { PackkitProvider } from '../provider.js';
import { PROVIDER_CAPABILITIES } from '../provider.js';

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(`Provider conformance failure — ${message}`);
}

const stable = (v: unknown) => JSON.stringify(v);

export interface ProviderConformanceHarness {
	provider: PackkitProvider;
	/** A deployment contract the provider supports. */
	supportedContract: unknown;
	/** A deployment contract the provider does NOT support. */
	unsupportedContract: unknown;
	/** Valid input for `provider.plan()` (provider-specific shape). */
	planInput: () => unknown;
	/** Sensitive strings that must never appear in a serialized plan (e.g. a token). */
	secrets?: string[];
}

export interface ProviderConformanceCheck {
	name: string;
	run(harness: ProviderConformanceHarness): void;
}

export const providerConformanceChecks: ProviderConformanceCheck[] = [
	{
		name: 'identity: id is a non-empty string',
		run({ provider }) {
			assert(
				typeof provider.id === 'string' && provider.id.length > 0,
				'id must be a non-empty string',
			);
		},
	},
	{
		name: 'capabilities: a non-empty list of known capabilities including plan',
		run({ provider }) {
			assert(
				Array.isArray(provider.capabilities) && provider.capabilities.length > 0,
				'capabilities must be a non-empty array',
			);
			for (const cap of provider.capabilities)
				assert(PROVIDER_CAPABILITIES.includes(cap), `unknown capability: ${cap}`);
			assert(
				provider.capabilities.includes('plan'),
				"every provider must advertise the 'plan' capability",
			);
		},
	},
	{
		name: 'supports: accepts the supported contract and rejects the unsupported one with a code',
		run({ provider, supportedContract, unsupportedContract }) {
			const ok = provider.supports(supportedContract);
			assert(ok.supported === true, 'supports() must accept the supported contract');
			assert(Array.isArray(ok.reasons), 'supports() must return a reasons array');
			const no = provider.supports(unsupportedContract);
			assert(no.supported === false, 'supports() must reject the unsupported contract');
			assert(
				typeof no.reasons?.[0]?.code === 'string' && no.reasons[0].code.length > 0,
				'a rejection must carry a reason code',
			);
		},
	},
	{
		name: 'supports: deterministic and tolerant of a missing contract',
		run({ provider, supportedContract }) {
			assert(
				stable(provider.supports(supportedContract)) ===
					stable(provider.supports(supportedContract)),
				'supports() must be deterministic',
			);
			const missing = provider.supports(undefined);
			assert(
				missing && missing.supported === false,
				'supports(undefined) must return unsupported, not throw',
			);
		},
	},
	{
		name: 'plan: carries the provider id and a numeric schema version',
		run({ provider, planInput }) {
			const plan = provider.plan(planInput());
			assert(plan.provider === provider.id, "plan.provider must equal the provider's id");
			assert(
				typeof plan.schemaVersion === 'number' && plan.schemaVersion >= 1,
				'plan.schemaVersion must be a number >= 1',
			);
		},
	},
	{
		name: 'plan: JSON-serializable (a host can persist it)',
		run({ provider, planInput }) {
			const plan = provider.plan(planInput());
			const round = JSON.parse(JSON.stringify(plan));
			assert(stable(round) === stable(plan), 'plan must survive a JSON round-trip unchanged');
		},
	},
	{
		name: 'plan: deterministic (same input → identical plan)',
		run({ provider, planInput }) {
			assert(
				stable(provider.plan(planInput())) === stable(provider.plan(planInput())),
				'plan() must be deterministic',
			);
		},
	},
	{
		name: 'plan: no declared secret leaks into it',
		run({ provider, planInput, secrets }) {
			if (!secrets?.length) return;
			const serialized = JSON.stringify(provider.plan(planInput()));
			for (const secret of secrets)
				assert(
					!serialized.includes(secret),
					`plan must not contain the secret ${JSON.stringify(secret)}`,
				);
		},
	},
	{
		name: 'apply: present iff the apply capability is advertised',
		run({ provider }) {
			const advertised = provider.capabilities.includes('apply');
			const present = typeof provider.apply === 'function';
			assert(
				advertised === present,
				advertised
					? "capabilities lists 'apply' but no apply() method exists"
					: "an apply() method exists but 'apply' is not advertised",
			);
		},
	},
];

export function runProviderConformanceSuite(
	harness: ProviderConformanceHarness,
	register?: (name: string, fn: () => void) => void,
): void {
	if (register) {
		for (const check of providerConformanceChecks) register(check.name, () => check.run(harness));
		return;
	}
	for (const check of providerConformanceChecks) check.run(harness);
}
