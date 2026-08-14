import { describe, it, expect } from 'vitest';
import { createPackkit } from './packkit.js';
import type {
	GeneratedProject,
	PackkitGenerator,
	ProjectDefinition,
	UpgradeResult,
} from './index.js';
import { computeProjectUpgrade, summarizeFileUpgrade } from './upgrade.js';
import { contentHash } from './hash.js';
import { toJson } from './render.js';
import { extendGeneratedProject } from './extend.js';

// A minimal generator (mirrors the reference in lifecycle.test) so the facade can
// be exercised without a real language generator.
function makeGenerator(id: string): PackkitGenerator {
	const gen = (config: Record<string, unknown>, preset?: string): GeneratedProject => {
		const name = String(config.name ?? 'app');
		const files: Record<string, string> = { 'README.md': `# ${name}\n` };
		files['packkit.json'] = toJson({
			baseline: { files: { 'README.md': { hash: contentHash(`# ${name}\n`) } } },
		});
		return {
			config: { name },
			files,
			diagnostics: [],
			metadata: { generatorId: id, generatorVersion: '1.0.0', protocolVersion: 1, preset },
			deploymentContract: { type: 'library' },
		};
	};
	return {
		id,
		language: id,
		version: '1.0.0',
		maturity: 'stable',
		protocol: {
			version: 1,
			capabilities: ['generate', 'project-definition', 'baseline-upgrade', 'deployment-contract'],
		},
		listPresets: () => [{ id: 'default', maturity: 'stable' }],
		getSchema: () => ({ schemaVersion: 1, generatorId: id, options: [{ id: 'name' }] }),
		createProject: (input) => {
			const { preset, name, config } = (input ?? {}) as {
				preset?: string;
				name?: string;
				config?: Record<string, unknown>;
			};
			return gen({ ...config, ...(name ? { name } : {}) }, preset);
		},
		exportDefinition: (p): ProjectDefinition => ({
			schemaVersion: 1,
			protocolVersion: 1,
			generator: { id, version: '1.0.0' },
			preset: p.metadata.preset,
			config: p.config,
			extensions: p.extensions,
		}),
		createProjectFromDefinition: (def) => {
			const base = gen(def.config, def.preset);
			const ext = def.extensions as
				{ files?: Record<string, { mode: 'add' | 'replace'; content: string }> } | undefined;
			return ext?.files ? extendGeneratedProject(base, { files: ext.files }).project : base;
		},
		upgradeProject: (input): UpgradeResult => {
			const { definition, currentFiles } = input as {
				definition: ProjectDefinition;
				currentFiles: Record<string, string>;
			};
			const generated = gen(definition.config, definition.preset);
			const baseline = currentFiles['packkit.json']
				? JSON.parse(currentFiles['packkit.json']).baseline
				: undefined;
			const gf = { ...generated.files };
			delete gf['packkit.json'];
			const { plan, patch } = computeProjectUpgrade({
				generatedFiles: gf,
				currentFiles,
				baselineFileHashes: baseline?.files,
			});
			const s = summarizeFileUpgrade(plan);
			return {
				generatedProject: generated,
				plan,
				patch,
				diagnostics: [],
				metadata: {
					baselineAvailable: plan.baselineAvailable,
					hasConflicts: s.conflicts > 0,
					hasSafeChanges: s.safeChanges > 0,
				},
			};
		},
	};
}

describe('createPackkit facade', () => {
	const packkit = createPackkit({ generators: [makeGenerator('alpha'), makeGenerator('beta')] });

	it('lists registered generators', () => {
		expect(
			packkit
				.listGenerators()
				.map((g) => g.id)
				.sort(),
		).toEqual(['alpha', 'beta']);
	});

	it('rejects a duplicate registration', () => {
		expect(() => packkit.register(makeGenerator('alpha'))).toThrow();
	});

	it('generates by generator id', () => {
		const project = packkit.generate({ generator: 'beta', preset: 'default', name: 'demo' });
		expect(project.files['README.md']).toContain('demo');
		expect(project.metadata.generatorId).toBe('beta');
	});

	it('throws a clear error for an unknown generator', () => {
		expect(() => packkit.generate({ generator: 'ghost' })).toThrow(/No generator registered/);
	});

	it('infers the owner for exportDefinition / replay (no id repeated)', () => {
		const project = packkit.generate({ generator: 'alpha', name: 'x' });
		const def = packkit.exportDefinition(project);
		expect(def.generator.id).toBe('alpha');
		const replayed = packkit.replay(def);
		expect(packkit.digest(replayed)).toBe(packkit.digest(project));
	});

	it('drives extend → export → replay uniformly, preserving intent', () => {
		const project = packkit.generate({ generator: 'beta', name: 'x' });
		const extended = packkit.extend(project, {
			files: { '.platform/app.json': { mode: 'add', content: '{}' } },
		}).project;
		const def = packkit.exportDefinition(extended);
		expect(packkit.replay(def).files['.platform/app.json']).toBe('{}');
	});

	it('upgrade returns the common envelope and preserves a user edit', () => {
		const project = packkit.generate({ generator: 'alpha', name: 'x' });
		const def = packkit.exportDefinition(project);
		const currentFiles = { ...project.files, 'README.md': `${project.files['README.md']}# edit\n` };
		const result = packkit.upgrade({ definition: def, currentFiles });
		expect(Array.isArray(result.plan.files)).toBe(true);
		expect(result.patch['README.md']).toBeUndefined();
	});
});
