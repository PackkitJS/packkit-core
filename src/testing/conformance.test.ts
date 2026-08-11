import { describe, it, expect } from 'vitest';
import { runGeneratorConformanceSuite } from './conformance.js';
import type { GeneratedProject, PackkitGenerator } from '../generator.js';

function makeProject(preset: string, name: string): GeneratedProject {
	return {
		config: { name, preset },
		files: { 'README.md': `# ${name}\n`, [`src/${name}.txt`]: preset },
		diagnostics: [],
		metadata: { generatorId: 'fixture', protocolVersion: 1, preset },
		deploymentContract: preset === 'app' ? { type: 'static', buildCommand: 'build', outputDirectory: 'dist' } : { type: 'library' },
	};
}

// A minimal, fully-conforming generator that emits Python-agnostic fixtures.
const goodGenerator: PackkitGenerator = {
	id: 'fixture',
	language: 'fixture',
	version: '1.0.0',
	maturity: 'stable',
	protocol: { version: 1, capabilities: ['generate', 'deployment-contract', 'project-definition', 'baseline-upgrade'] },
	listPresets: () => [{ id: 'lib' }, { id: 'app' }],
	getSchema: () => ({ schemaVersion: 1, generatorId: 'fixture', options: [{ id: 'name' }, { id: 'target' }] }),
	createProject: (input) => {
		const { preset = 'lib', name = 'x' } = (input ?? {}) as { preset?: string; name?: string };
		return makeProject(preset, name);
	},
	createProjectFromDefinition: (def) => makeProject(def.preset ?? 'lib', (def.config.name as string) ?? 'x'),
	exportDefinition: (project) => ({
		schemaVersion: 1,
		protocolVersion: 1,
		generator: { id: 'fixture', version: '1.0.0' },
		preset: project.metadata.preset,
		config: project.config,
	}),
	upgradeProject: () => ({ patch: {} }),
};

describe('a conforming generator passes every check', () => {
	runGeneratorConformanceSuite(goodGenerator, (name, fn) => it(name, fn));
});

describe('the suite catches real violations', () => {
	const broken = (over: Partial<PackkitGenerator>): PackkitGenerator => ({ ...goodGenerator, ...over });

	it('duplicate preset ids', () => {
		expect(() => runGeneratorConformanceSuite(broken({ listPresets: () => [{ id: 'lib' }, { id: 'lib' }] }))).toThrow(/duplicate preset id/);
	});
	it('non-deterministic generation', () => {
		let n = 0;
		expect(() => runGeneratorConformanceSuite(broken({ createProject: () => makeProject('lib', `x${n++}`) }))).toThrow(/not deterministic/);
	});
	it('an unsafe generated path', () => {
		expect(() =>
			runGeneratorConformanceSuite(broken({ listPresets: () => [{ id: 'lib' }], createProject: () => ({ ...makeProject('lib', 'x'), files: { '../escape': 'x' } }) })),
		).toThrow(/unsafe path/);
	});
	it('an invalid deployment contract', () => {
		expect(() =>
			runGeneratorConformanceSuite(broken({ listPresets: () => [{ id: 'lib' }], createProject: () => ({ ...makeProject('lib', 'x'), deploymentContract: { type: 'static' } as never }) })),
		).toThrow(/invalid deployment contract/);
	});
	it("advertising a capability it doesn't implement", () => {
		expect(() => runGeneratorConformanceSuite(broken({ upgradeProject: undefined }))).toThrow(/no upgradeProject/);
	});
});
