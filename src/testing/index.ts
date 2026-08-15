// @packkit/core/testing — the conformance suites. Dev-only; not part of the
// browser or default runtime surface.
//
//  • runGeneratorConformanceSuite   — the generator GENERATES correctly.
//  • runEmbeddedLifecycleConformance — a host can drive its full LIFECYCLE
//    (digest, definition replay, host extension, baseline upgrade) uniformly.
//  • runProviderConformanceSuite    — a deployment provider is well-behaved
//    (stable id, deterministic support/plan, serializable schema-versioned plan,
//    no leaked secrets, apply capability-gated).
export { runGeneratorConformanceSuite, generatorConformanceChecks } from './conformance.js';
export type { ConformanceCheck } from './conformance.js';
export { runEmbeddedLifecycleConformance, embeddedLifecycleChecks } from './lifecycle.js';
export type { LifecycleCheck } from './lifecycle.js';
export { runProviderConformanceSuite, providerConformanceChecks } from './provider-conformance.js';
export type {
	ProviderConformanceCheck,
	ProviderConformanceHarness,
} from './provider-conformance.js';
