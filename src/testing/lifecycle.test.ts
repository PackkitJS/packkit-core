import { describe, it } from 'vitest';
import type { GeneratedProject, PackkitGenerator, ProjectDefinition } from '../generator.js';
import { contentHash } from '../hash.js';
import { toJson } from '../render.js';
import { extendGeneratedProject } from '../extend.js';
import { computeProjectUpgrade, summarizeFileUpgrade, type UpgradeResult } from '../upgrade.js';
import { runGeneratorConformanceSuite } from './conformance.js';
import { runEmbeddedLifecycleConformance } from './lifecycle.js';

// A minimal reference generator built ENTIRELY on core primitives — the template a
// real generator follows to pass the lifecycle suite. If the suite is coherent,
// this passes it; each real generator (JS, Python) must do the same.

const VERSION = '1.0.0';
const baselineOf = (files: Record<string, string>) => ({
	files: Object.fromEntries(Object.entries(files).map(([p, c]) => [p, { hash: contentHash(c) }])),
});

function generate(config: Record<string, unknown>, preset?: string): GeneratedProject {
	const name = String(config.name ?? 'app');
	const files: Record<string, string> = { 'README.md': `# ${name}\n`, 'src/main.txt': 'hello\n' };
	const baseline = baselineOf(files); // scaffold-time, before any extension
	files['packkit.json'] = toJson({ generator: 'reference', preset, baseline });
	return {
		config: { name },
		files,
		diagnostics: [],
		metadata: { generatorId: 'reference', generatorVersion: VERSION, protocolVersion: 1, preset },
		deploymentContract: { type: 'library' },
	};
}

const referenceGenerator: PackkitGenerator = {
	id: 'reference',
	language: 'reference',
	version: VERSION,
	maturity: 'stable',
	protocol: {
		version: 1,
		capabilities: ['generate', 'project-definition', 'baseline-upgrade', 'deployment-contract'],
	},
	listPresets: () => [{ id: 'default', maturity: 'stable' }],
	getSchema: () => ({ schemaVersion: 1, generatorId: 'reference', options: [{ id: 'name' }] }),
	createProject: (input) => {
		const { preset, name, config } = (input ?? {}) as {
			preset?: string;
			name?: string;
			config?: Record<string, unknown>;
		};
		return generate({ ...config, ...(name ? { name } : {}) }, preset);
	},
	exportDefinition: (project): ProjectDefinition => ({
		schemaVersion: 1,
		protocolVersion: 1,
		generator: { id: 'reference', version: VERSION },
		preset: project.metadata.preset,
		config: project.config,
		extensions: project.extensions,
		baseline: JSON.parse(project.files['packkit.json']!).baseline,
	}),
	createProjectFromDefinition: (def) => {
		const base = generate(def.config, def.preset);
		const ext = def.extensions as
			{ files?: Record<string, { mode: 'add' | 'replace'; content: string }> } | undefined;
		return ext?.files ? extendGeneratedProject(base, { files: ext.files }).project : base;
	},
	upgradeProject: (input): UpgradeResult => {
		const { definition, currentFiles } = input as {
			definition: ProjectDefinition;
			currentFiles: Record<string, string>;
		};
		const generated = referenceGenerator.createProjectFromDefinition!(definition);
		const baseline = currentFiles['packkit.json']
			? JSON.parse(currentFiles['packkit.json']).baseline
			: undefined;
		const generatedFiles = { ...generated.files };
		delete generatedFiles['packkit.json']; // provenance, not diffed
		const { plan, patch } = computeProjectUpgrade({
			generatedFiles,
			currentFiles,
			baselineFileHashes: baseline?.files,
		});
		const s = summarizeFileUpgrade(plan);
		return {
			generatedProject: generated,
			plan,
			patch,
			diagnostics: generated.diagnostics,
			metadata: {
				fromVersion: definition.generator.version,
				toVersion: VERSION,
				baselineAvailable: plan.baselineAvailable,
				hasConflicts: s.conflicts > 0,
				hasSafeChanges: s.safeChanges > 0,
			},
		};
	},
};

describe('reference generator — generation conformance', () => {
	runGeneratorConformanceSuite(referenceGenerator, it);
});

describe('reference generator — embedded lifecycle conformance', () => {
	runEmbeddedLifecycleConformance(referenceGenerator, it);
});
