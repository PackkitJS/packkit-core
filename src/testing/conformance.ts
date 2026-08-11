// The executable definition of "Packkit-compatible". Every generator runs the
// same suite; passing it — not merely satisfying the TypeScript interface — is
// what makes a generator part of the platform.
//
// Framework-agnostic: each check throws on failure (no test-runner dependency),
// so it runs under node:test, vitest, or anything else. Convention: a generator's
// createProject accepts `{ preset, name, config? }`.

import { PACKKIT_PROTOCOL_VERSION } from '../protocol.js';
import { GENERATOR_CAPABILITIES } from '../generator.js';
import type { GeneratedProject, MaturityStatus, PackkitGenerator } from '../generator.js';
import { validatePathMap, validateRelativePath } from '../paths.js';
import { validateDeploymentContract } from '../contracts.js';

const MATURITIES: readonly MaturityStatus[] = ['experimental', 'preview', 'stable', 'deprecated'];

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(`Conformance failure — ${message}`);
}

function generateForPreset(generator: PackkitGenerator, presetId: string): GeneratedProject {
	return generator.createProject({ preset: presetId, name: 'conformance-fixture' });
}

export interface ConformanceCheck {
	name: string;
	run(generator: PackkitGenerator): void;
}

export const generatorConformanceChecks: ConformanceCheck[] = [
	{
		name: 'identity: id, language, version are non-empty strings and maturity is valid',
		run(g) {
			assert(typeof g.id === 'string' && g.id.length > 0, 'id must be a non-empty string');
			assert(typeof g.language === 'string' && g.language.length > 0, 'language must be a non-empty string');
			assert(typeof g.version === 'string' && g.version.length > 0, 'version must be a non-empty string');
			assert(MATURITIES.includes(g.maturity), `maturity must be one of ${MATURITIES.join(', ')}`);
		},
	},
	{
		name: 'protocol: version is supported and capabilities are valid',
		run(g) {
			assert(typeof g.protocol?.version === 'number', 'protocol.version must be a number');
			assert(g.protocol.version <= PACKKIT_PROTOCOL_VERSION, `protocol.version ${g.protocol.version} exceeds core ${PACKKIT_PROTOCOL_VERSION}`);
			assert(Array.isArray(g.protocol.capabilities) && g.protocol.capabilities.length > 0, 'capabilities must be a non-empty array');
			for (const cap of g.protocol.capabilities) assert(GENERATOR_CAPABILITIES.includes(cap), `unknown capability: ${cap}`);
			assert(g.protocol.capabilities.includes('generate'), "every generator must advertise the 'generate' capability");
		},
	},
	{
		name: 'presets: at least one, with unique non-empty ids',
		run(g) {
			const presets = g.listPresets();
			assert(Array.isArray(presets) && presets.length > 0, 'listPresets must return at least one preset');
			const seen = new Set<string>();
			for (const preset of presets) {
				assert(typeof preset.id === 'string' && preset.id.length > 0, 'preset id must be a non-empty string');
				assert(!seen.has(preset.id), `duplicate preset id: ${preset.id}`);
				seen.add(preset.id);
				if (preset.deprecated) assert(typeof preset.replacement === 'string' && preset.replacement.length > 0, `deprecated preset "${preset.id}" must name a replacement`);
			}
		},
	},
	{
		name: 'schema: valid, generatorId matches, option ids unique',
		run(g) {
			const schema = g.getSchema();
			assert(typeof schema.schemaVersion === 'number', 'schema.schemaVersion must be a number');
			assert(schema.generatorId === g.id, 'schema.generatorId must equal the generator id');
			const seen = new Set<string>();
			for (const option of schema.options) {
				assert(typeof option.id === 'string' && option.id.length > 0, 'option id must be a non-empty string');
				assert(!seen.has(option.id), `duplicate option id: ${option.id}`);
				seen.add(option.id);
			}
		},
	},
	{
		name: 'generation: every preset produces safe, deterministic output',
		run(g) {
			for (const preset of g.listPresets()) {
				const project = generateForPreset(g, preset.id);
				const paths = Object.keys(project.files);
				assert(paths.length > 0, `preset "${preset.id}" generated no files`);
				for (const path of paths) {
					assert(validateRelativePath(path).ok, `preset "${preset.id}" produced an unsafe path: "${path}"`);
				}
				const { diagnostics } = validatePathMap(project.files);
				assert(diagnostics.length === 0, `preset "${preset.id}" has path collisions: ${diagnostics.map((d) => d.message).join('; ')}`);
				assert(project.metadata.generatorId === g.id, `preset "${preset.id}": metadata.generatorId must equal the generator id`);
				assert(project.metadata.protocolVersion === g.protocol.version, `preset "${preset.id}": metadata.protocolVersion must equal protocol.version`);

				const again = generateForPreset(g, preset.id);
				assert(JSON.stringify(project.files) === JSON.stringify(again.files), `preset "${preset.id}" generation is not deterministic`);
			}
		},
	},
	{
		name: "deployment-contract: every preset emits a valid contract (if 'deployment-contract' advertised)",
		run(g) {
			if (!g.protocol.capabilities.includes('deployment-contract')) return;
			for (const preset of g.listPresets()) {
				const { ok, errors } = validateDeploymentContract(generateForPreset(g, preset.id).deploymentContract);
				assert(ok, `preset "${preset.id}" has an invalid deployment contract: ${errors.join('; ')}`);
			}
		},
	},
	{
		name: "project-definition: export/replay round-trips (if 'project-definition' advertised)",
		run(g) {
			if (!g.protocol.capabilities.includes('project-definition')) return;
			assert(typeof g.exportDefinition === 'function', "advertises 'project-definition' but has no exportDefinition()");
			assert(typeof g.createProjectFromDefinition === 'function', "advertises 'project-definition' but has no createProjectFromDefinition()");
			for (const preset of g.listPresets()) {
				const original = generateForPreset(g, preset.id);
				const replayed = g.createProjectFromDefinition(g.exportDefinition(original));
				assert(JSON.stringify(replayed.files) === JSON.stringify(original.files), `preset "${preset.id}" definition round-trip changed the output`);
			}
		},
	},
	{
		name: "baseline-upgrade: upgradeProject is implemented (if 'baseline-upgrade' advertised)",
		run(g) {
			if (!g.protocol.capabilities.includes('baseline-upgrade')) return;
			assert(typeof g.upgradeProject === 'function', "advertises 'baseline-upgrade' but has no upgradeProject()");
		},
	},
];

/**
 * Run the conformance suite against a generator. Pass a `register` (your test
 * runner's `test`/`it`) to get one named test per check; omit it to run all
 * checks inline, throwing on the first failure.
 */
export function runGeneratorConformanceSuite(generator: PackkitGenerator, register?: (name: string, fn: () => void) => void): void {
	if (register) {
		for (const check of generatorConformanceChecks) register(check.name, () => check.run(generator));
		return;
	}
	for (const check of generatorConformanceChecks) check.run(generator);
}
