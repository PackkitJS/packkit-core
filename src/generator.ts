import type { Diagnostic } from './diagnostics.js';
import type { DeploymentContract } from './contracts.js';
import type { ManifestDiffer } from './manifest.js';

// The universal generator contract. A language generator implements this; MCP,
// web, and providers consume it and never a generator's internals.

export type MaturityStatus = 'experimental' | 'preview' | 'stable' | 'deprecated';

export type GeneratorCapability =
	'generate' | 'project-definition' | 'baseline-upgrade' | 'deployment-contract' | 'browser';

export const GENERATOR_CAPABILITIES: readonly GeneratorCapability[] = [
	'generate',
	'project-definition',
	'baseline-upgrade',
	'deployment-contract',
	'browser',
];

/** What protocol version a generator speaks, and which capabilities it actually
 *  implements — so consumers degrade gracefully instead of assuming everything. */
export interface GeneratorProtocol {
	version: number;
	capabilities: GeneratorCapability[];
}

/** A configurable option, keyed by a STABLE id. UI labels/presentation change
 *  independently of the id, which may be stored outside Packkit. */
export interface OptionDescriptor {
	id: string;
	label?: string;
	type?: string;
	choices?: string[];
	default?: unknown;
	description?: string;
}

export interface GeneratorSchema {
	schemaVersion: number;
	generatorId: string;
	options: OptionDescriptor[];
}

/** A preset, keyed by a STABLE id. After 1.0 an id is a public identifier: it is
 *  not silently renamed or reused — renames go through `deprecated`/`replacement`. */
export interface PresetDescriptor {
	id: string;
	description?: string;
	maturity?: MaturityStatus;
	deprecated?: boolean;
	replacement?: string;
}

export interface GeneratedProjectMetadata {
	generatorId: string;
	generatorVersion?: string;
	protocolVersion: number;
	preset?: string;
	[key: string]: unknown;
}

export interface GeneratedProject {
	config: Record<string, unknown>;
	/** path → file contents. Deterministic: same config → same bytes. */
	files: Record<string, string>;
	diagnostics: Diagnostic[];
	metadata: GeneratedProjectMetadata;
	deploymentContract: DeploymentContract;
}

/** A reproducible description of a project: replaying it regenerates the same
 *  output. Carries both the definition schema version and the protocol version. */
export interface ProjectDefinition {
	schemaVersion: number;
	protocolVersion: number;
	generator: { id: string; version?: string };
	preset?: string;
	config: Record<string, unknown>;
	extensions?: unknown;
}

/** A scaffold-time snapshot for baseline-aware upgrades: a hash per file plus a
 *  generator-specific structural manifest snapshot (see ManifestDiffer). */
export interface Baseline {
	schemaVersion: number;
	files: Record<string, { hash: string }>;
	manifest?: unknown;
}

export interface PackkitGenerator {
	/** Stable public identifier, e.g. "javascript" | "python". */
	id: string;
	language: string;
	version: string;
	maturity: MaturityStatus;
	protocol: GeneratorProtocol;

	listPresets(): PresetDescriptor[];
	getSchema(): GeneratorSchema;
	createProject(input: unknown): GeneratedProject;
	createProjectFromDefinition?(definition: ProjectDefinition): GeneratedProject;
	exportDefinition?(project: GeneratedProject): ProjectDefinition;
	upgradeProject?(input: unknown): unknown;
	/** The generator's structured-manifest differs (package.json, pyproject.toml, …)
	 *  — the per-generator seam core keeps language semantics behind. Each differ's
	 *  Diff shape is its own (JS returns scripts/deps sections; Python returns
	 *  dependencies/entry-points), so the array is left fully generic: a reader gets
	 *  `unknown` back from `diff()` and narrows by the generator it came from. Pinning
	 *  this to the default `ManifestDiffResult` would force every richer differ to cast. */
	manifestDiffers?: ManifestDiffer<unknown, unknown>[];
}
