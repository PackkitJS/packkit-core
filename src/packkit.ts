import type {
	GeneratedProject,
	GeneratorCapability,
	GeneratorSchema,
	MaturityStatus,
	PackkitGenerator,
	PresetDescriptor,
	ProjectDefinition,
} from './generator.js';
import type { DeploymentContract } from './contracts.js';
import type { ExtendResult, GeneratedProjectExtension } from './extend.js';
import type { UpgradeResult } from './upgrade.js';
import { createGeneratorRegistry, type GeneratorRegistry } from './registry.js';
import { extendGeneratedProject } from './extend.js';
import { calculateGeneratedProjectDigest } from './digest.js';
import { PackkitCoreError } from './errors.js';

// A thin ergonomic facade over a generator registry + the core lifecycle helpers.
// Deliberately NOT a framework: it just spares a host the boilerplate of resolving
// a generator by id for every call, and infers the owning generator from a
// project's or definition's own metadata. A host that prefers the registry +
// standalone helpers can keep using those — this adds nothing they can't already do.

export interface GeneratorSummary {
	id: string;
	language: string;
	version: string;
	maturity: MaturityStatus;
	capabilities: GeneratorCapability[];
}

export interface GenerateRequest {
	/** Registered generator id (from listGenerators). */
	generator: string;
	preset?: string;
	name?: string;
	/** Generator options — opaque to core; the owning generator validates them. */
	options?: Record<string, unknown>;
}

export interface Packkit {
	readonly registry: GeneratorRegistry;
	register(generator: PackkitGenerator): void;
	get(id: string): PackkitGenerator | undefined;
	listGenerators(): GeneratorSummary[];
	listPresets(generatorId: string): PresetDescriptor[];
	getSchema(generatorId: string): GeneratorSchema;
	generate(request: GenerateRequest): GeneratedProject;
	/** Layer host-owned files (generic; manifest merges stay per-generator). */
	extend(
		project: GeneratedProject,
		extension: GeneratedProjectExtension,
	): ExtendResult<GeneratedProject>;
	/** Canonical identity digest. */
	digest(project: GeneratedProject): string;
	getDeploymentContract(project: GeneratedProject): DeploymentContract;
	/** The owning generator is read from project.metadata.generatorId. */
	exportDefinition(project: GeneratedProject): ProjectDefinition;
	/** The owning generator is read from definition.generator.id. */
	replay(definition: ProjectDefinition): GeneratedProject;
	upgrade(input: {
		definition: ProjectDefinition;
		currentFiles: Record<string, string>;
	}): UpgradeResult;
}

/** Create a Packkit platform facade over an explicit set of generators. */
export function createPackkit(options: { generators?: PackkitGenerator[] } = {}): Packkit {
	const registry = createGeneratorRegistry();
	for (const generator of options.generators ?? []) registry.register(generator);

	const need = (id: string): PackkitGenerator => {
		const g = registry.get(id);
		if (!g) {
			const ids =
				registry
					.list()
					.map((x) => x.id)
					.join(', ') || '(none)';
			throw new PackkitCoreError(
				'UNKNOWN_GENERATOR',
				`No generator registered with id "${id}". Registered: ${ids}.`,
			);
		}
		return g;
	};

	const requireCapability = (
		g: PackkitGenerator,
		capability: GeneratorCapability,
		method: keyof PackkitGenerator,
	) => {
		if (!g.protocol.capabilities.includes(capability) || typeof g[method] !== 'function') {
			throw new PackkitCoreError(
				'CAPABILITY_UNSUPPORTED',
				`Generator "${g.id}" does not support "${capability}" (needed for ${String(method)}).`,
			);
		}
	};

	return {
		registry,
		register: (generator) => registry.register(generator),
		get: (id) => registry.get(id),
		listGenerators: () =>
			registry.list().map((g) => ({
				id: g.id,
				language: g.language,
				version: g.version,
				maturity: g.maturity,
				capabilities: g.protocol.capabilities,
			})),
		listPresets: (id) => need(id).listPresets(),
		getSchema: (id) => need(id).getSchema(),
		generate: ({ generator, preset, name, options }) =>
			need(generator).createProject({ preset, name, config: options }),
		extend: (project, extension) => extendGeneratedProject(project, extension),
		digest: (project) => calculateGeneratedProjectDigest(project),
		getDeploymentContract: (project) => project.deploymentContract,
		exportDefinition: (project) => {
			const g = need(project.metadata.generatorId);
			requireCapability(g, 'project-definition', 'exportDefinition');
			return g.exportDefinition!(project);
		},
		replay: (definition) => {
			const g = need(definition.generator.id);
			requireCapability(g, 'project-definition', 'createProjectFromDefinition');
			return g.createProjectFromDefinition!(definition);
		},
		upgrade: ({ definition, currentFiles }) => {
			const g = need(definition.generator.id);
			requireCapability(g, 'baseline-upgrade', 'upgradeProject');
			return g.upgradeProject!({ definition, currentFiles }) as UpgradeResult;
		},
	};
}
