// @packkit/core — the browser-safe default entry. Types + protocol + pure
// primitives only. Anything needing Node (the filesystem writer) lives in
// @packkit/core/node; the conformance suite lives in @packkit/core/testing.
//
// A CI test asserts nothing reachable from here imports a `node:` builtin.

export { PACKKIT_PROTOCOL_VERSION } from './protocol.js';
export { PackkitCoreError } from './errors.js';
export { contentHash } from './hash.js';
export { calculateGeneratedProjectDigest } from './digest.js';
export { toJson } from './render.js';
export { validateRelativePath, validatePathMap } from './paths.js';
export type { PathValidation } from './paths.js';
export type { Diagnostic, DiagnosticSeverity } from './diagnostics.js';
export { classifyChange } from './diff.js';
export type { ChangeStatus, ChangeClassification } from './diff.js';
export { extendGeneratedProject } from './extend.js';
export type {
	ExtensionMode,
	FileExtension,
	GeneratedProjectExtension,
	AppliedExtension,
	ExtendResult,
} from './extend.js';
export { validateDeploymentContract, DEPLOYABLE_TYPES } from './contracts.js';
export type {
	DeploymentType,
	DeploymentContract,
	StaticDeploymentContract,
	NodeServiceDeploymentContract,
	WorkerDeploymentContract,
	CliDeploymentContract,
	LibraryDeploymentContract,
	FullstackDeploymentContract,
} from './contracts.js';
export { GENERATOR_CAPABILITIES } from './generator.js';
export type {
	PackkitGenerator,
	GeneratorProtocol,
	GeneratorCapability,
	MaturityStatus,
	OptionDescriptor,
	GeneratorSchema,
	PresetDescriptor,
	GeneratedProject,
	GeneratedProjectMetadata,
	ProjectDefinition,
	Baseline,
} from './generator.js';
export type { ManifestDiffer, ManifestChange, ManifestDiffResult } from './manifest.js';
export { createGeneratorRegistry } from './registry.js';
export type { GeneratorRegistry } from './registry.js';
export { computeProjectUpgrade, summarizeFileUpgrade } from './upgrade.js';
export type {
	UpgradeFileStatus,
	UpgradeFileChange,
	FileUpgradePlan,
	UpgradeMetadata,
	UpgradeResult,
} from './upgrade.js';
