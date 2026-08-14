// The embedded LIFECYCLE conformance suite — the executable definition of a
// Packkit-compatible EMBEDDING. Where generatorConformanceChecks proves a
// generator generates, this proves a host can drive its full lifecycle (digest,
// definition replay, host extension, baseline upgrade) through one vocabulary,
// whatever the language. Each check is gated on the generator's advertised
// capabilities, so a generator is never failed for a lifecycle it doesn't claim.

import type { GeneratedProject, PackkitGenerator } from '../generator.js';
import { calculateGeneratedProjectDigest } from '../digest.js';
import { extendGeneratedProject } from '../extend.js';
import { validateDeploymentContract } from '../contracts.js';

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(`Lifecycle conformance failure — ${message}`);
}

const create = (g: PackkitGenerator, presetId: string): GeneratedProject =>
	g.createProject({ preset: presetId, name: 'lifecycle-fixture' });

// A stable text file every generator emits, safe to "edit" for the upgrade check.
function pickEditablePath(files: Record<string, string>): string | undefined {
	if ('README.md' in files) return 'README.md';
	return Object.keys(files)
		.sort()
		.find((p) => p !== 'packkit.json' && !p.endsWith('.json') && !p.endsWith('.toml'));
}

export interface LifecycleCheck {
	name: string;
	run(generator: PackkitGenerator): void;
}

export const embeddedLifecycleChecks: LifecycleCheck[] = [
	{
		name: 'digest: is stable across regeneration',
		run(g) {
			for (const preset of g.listPresets()) {
				const a = create(g, preset.id);
				const b = create(g, preset.id);
				assert(
					calculateGeneratedProjectDigest(a) === calculateGeneratedProjectDigest(b),
					`preset "${preset.id}": digest is not stable across regeneration`,
				);
			}
		},
	},
	{
		name: "definition: replay reproduces the same digest (if 'project-definition' advertised)",
		run(g) {
			if (!g.protocol.capabilities.includes('project-definition')) return;
			assert(
				typeof g.exportDefinition === 'function' &&
					typeof g.createProjectFromDefinition === 'function',
				"advertises 'project-definition' but is missing exportDefinition/createProjectFromDefinition",
			);
			for (const preset of g.listPresets()) {
				const original = create(g, preset.id);
				const def = g.exportDefinition(original);
				assert(
					def.generator?.id === g.id,
					`preset "${preset.id}": exported definition.generator.id must equal the generator id`,
				);
				const replayed = g.createProjectFromDefinition(def);
				assert(
					calculateGeneratedProjectDigest(replayed) === calculateGeneratedProjectDigest(original),
					`preset "${preset.id}": replayed definition digest differs from the original`,
				);
			}
		},
	},
	{
		name: "extension: host-added file survives export → replay (if 'project-definition' advertised)",
		run(g) {
			if (!g.protocol.capabilities.includes('project-definition')) return;
			assert(
				typeof g.exportDefinition === 'function' &&
					typeof g.createProjectFromDefinition === 'function',
				"advertises 'project-definition' but is missing exportDefinition/createProjectFromDefinition",
			);
			const preset = g.listPresets()[0];
			assert(preset, 'generator has no presets');
			const project = create(g, preset.id);
			const marker = '.packkit-platform/host.json';
			const content = '{"host":true}';
			const { project: extended, diagnostics } = extendGeneratedProject(project, {
				files: { [marker]: { mode: 'add', content } },
			});
			assert(
				diagnostics.every((d) => d.severity !== 'error'),
				`extend reported errors: ${diagnostics.map((d) => d.message).join('; ')}`,
			);
			assert(extended.files[marker] === content, 'extend did not apply the host file');

			const def = g.exportDefinition(extended);
			const replayed = g.createProjectFromDefinition(def);
			assert(
				replayed.files[marker] === content,
				'host extension did not survive definition export → replay (extensions must be persisted in the definition and re-applied)',
			);
		},
	},
	{
		name: "upgrade: returns the common envelope and preserves a user edit (if 'baseline-upgrade' advertised)",
		run(g) {
			if (!g.protocol.capabilities.includes('baseline-upgrade')) return;
			assert(
				typeof g.upgradeProject === 'function',
				"advertises 'baseline-upgrade' but has no upgradeProject()",
			);
			const preset = g.listPresets()[0];
			assert(preset, 'generator has no presets');
			const project = create(g, preset.id);
			const def = g.exportDefinition ? g.exportDefinition(project) : undefined;
			assert(
				def,
				"baseline-upgrade requires 'project-definition' to obtain a definition to replay",
			);

			const editPath = pickEditablePath(project.files);
			assert(editPath, 'no editable text file to exercise the upgrade');
			const currentFiles = {
				...project.files,
				[editPath]: `${project.files[editPath]}\n# a local user edit\n`,
			};

			const result = g.upgradeProject({ definition: def, currentFiles }) as {
				generatedProject?: unknown;
				plan?: { files?: unknown[] };
				patch?: Record<string, string>;
				diagnostics?: unknown[];
				metadata?: Record<string, unknown>;
			};

			assert(result && typeof result === 'object', 'upgradeProject returned no result');
			assert(
				result.generatedProject,
				'upgrade result is missing generatedProject (common envelope)',
			);
			assert(
				result.plan && Array.isArray(result.plan.files),
				'upgrade result is missing plan.files (common envelope)',
			);
			assert(
				result.patch && typeof result.patch === 'object',
				'upgrade result is missing patch (common envelope)',
			);
			assert(
				Array.isArray(result.diagnostics),
				'upgrade result is missing diagnostics (common envelope)',
			);
			assert(
				result.metadata && typeof result.metadata === 'object',
				'upgrade result is missing metadata (common envelope)',
			);
			assert(
				result.patch![editPath] === undefined,
				`the user's edit to "${editPath}" must not be in the auto-apply patch`,
			);
		},
	},
	{
		name: 'deployment-contract: validates against the core protocol (if advertised)',
		run(g) {
			if (!g.protocol.capabilities.includes('deployment-contract')) return;
			for (const preset of g.listPresets()) {
				const { ok, errors } = validateDeploymentContract(create(g, preset.id).deploymentContract);
				assert(
					ok,
					`preset "${preset.id}" emits an invalid deployment contract: ${errors.join('; ')}`,
				);
			}
		},
	},
];

/** Run the embedded lifecycle suite against a generator. Pass a `register` (your
 *  test runner's `test`/`it`) for one named test per check; omit it to run inline. */
export function runEmbeddedLifecycleConformance(
	generator: PackkitGenerator,
	register?: (name: string, fn: () => void) => void,
): void {
	if (register) {
		for (const check of embeddedLifecycleChecks) register(check.name, () => check.run(generator));
		return;
	}
	for (const check of embeddedLifecycleChecks) check.run(generator);
}
