// The provider contract. A provider consumes a project's provider-neutral
// **deployment contract** and turns it into a real deployment — whether by calling a
// platform API (provider-netlify) or by emitting IaC + a pipeline (provider-aws). Like
// PackkitGenerator for generators, this is the shared shape the provider conformance
// suite checks; passing that suite is what makes a provider part of the platform.

export type ProviderCapability =
	| 'plan' // pure: produces a deterministic, serializable plan
	| 'apply'; // performs the deployment (via injected deps — never ambient credentials)

export const PROVIDER_CAPABILITIES: readonly ProviderCapability[] = ['plan', 'apply'];

export interface ProviderSupportReason {
	code: string;
	message: string;
}

export interface ProviderSupportResult {
	supported: boolean;
	reasons: ProviderSupportReason[];
}

// Every plan carries the provider id + a schema version, so a host can persist it and
// evolve the shape over time. Provider-specific fields extend it.
export interface ProviderPlan {
	provider: string;
	schemaVersion: number;
	[key: string]: unknown;
}

export interface PackkitProvider {
	/** Stable public identifier, e.g. 'netlify' or 'aws'. */
	id: string;
	capabilities: ProviderCapability[];
	/** Pure: reads only the deployment contract, never the generator or its language. */
	supports(contract: unknown): ProviderSupportResult;
	/** Pure + deterministic + JSON-serializable. Provider-specific input shape. */
	plan(input: unknown): ProviderPlan;
	/** Present iff the `apply` capability is advertised. Performs I/O through injected
	 *  dependencies; never sources credentials itself. */
	apply?(plan: ProviderPlan, deps?: unknown): unknown;
}
