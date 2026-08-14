// @packkit/core/testing — the conformance suites. Dev-only; not part of the
// browser or default runtime surface.
//
//  • runGeneratorConformanceSuite   — the generator GENERATES correctly.
//  • runEmbeddedLifecycleConformance — a host can drive its full LIFECYCLE
//    (digest, definition replay, host extension, baseline upgrade) uniformly.
export { runGeneratorConformanceSuite, generatorConformanceChecks } from './conformance.js';
export type { ConformanceCheck } from './conformance.js';
export { runEmbeddedLifecycleConformance, embeddedLifecycleChecks } from './lifecycle.js';
export type { LifecycleCheck } from './lifecycle.js';
