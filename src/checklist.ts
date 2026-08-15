/**
 * The canonical capability checklist every Packkit generator fulfils — each realized
 * *idiomatically* for its language (JS eslint ≈ Python ruff ≈ Go gofmt; JS Changesets ≈
 * Python PyPI Trusted Publishing ≈ Go GoReleaser). It is the onboarding contract for a
 * new language: implement the whole list the way that language does it, so Python and Go
 * are never afterthoughts and the next language (Rust, …) ships complete on day one.
 *
 * This is governance data, not runtime behavior — a single source of truth referenced by
 * `docs/GENERATOR-CHECKLIST.md` (the per-language realization matrix) and by each
 * generator's own completeness tests.
 */

export type ChecklistCategory =
	'source' | 'quality' | 'docs' | 'repo' | 'ci' | 'release' | 'deploy' | 'protocol';

/** When a capability applies. */
export type ChecklistScope = 'all' | 'deployable' | 'containerizable' | 'publishable';

export interface GeneratorChecklistItem {
	/** Stable identifier. */
	id: string;
	title: string;
	category: ChecklistCategory;
	scope: ChecklistScope;
	/** What the capability means, language-neutrally. */
	description: string;
	/** How JS / Python / Go each realize it (illustrative). */
	realizations: { js: string; python: string; go: string };
}

export const GENERATOR_CHECKLIST: readonly GeneratorChecklistItem[] = [
	{
		id: 'source-layout',
		title: 'Idiomatic source layout + documented public API',
		category: 'source',
		scope: 'all',
		description: 'The language-conventional project layout with a documented entry point.',
		realizations: {
			js: 'src/index.ts',
			python: 'src/<pkg>/__init__.py + py.typed',
			go: '<pkg>.go at the module root',
		},
	},
	{
		id: 'tests',
		title: 'A runnable test wired to a test runner',
		category: 'quality',
		scope: 'all',
		description: 'At least one test that runs out of the box with the ecosystem test runner.',
		realizations: { js: 'Vitest', python: 'pytest', go: 'go test (table tests)' },
	},
	{
		id: 'lint-format',
		title: 'Linter + formatter configured',
		category: 'quality',
		scope: 'all',
		description: 'Static lint + deterministic formatting the project passes out of the box.',
		realizations: { js: 'ESLint + Prettier', python: 'ruff', go: 'gofmt' },
	},
	{
		id: 'typecheck',
		title: 'Static type checking (where the language has it)',
		category: 'quality',
		scope: 'all',
		description:
			'Type checking wired where applicable; a no-op where the compiler already does it.',
		realizations: { js: 'tsc --noEmit', python: 'mypy --strict', go: 'built into the compiler' },
	},
	{
		id: 'license',
		title: 'License choice (MIT · Apache-2.0 · ISC · none) + LICENSE file',
		category: 'docs',
		scope: 'all',
		description: 'The same set of license options across generators, writing a real LICENSE file.',
		realizations: { js: 'MIT/Apache-2.0/ISC/none', python: 'same', go: 'same' },
	},
	{
		id: 'readme',
		title: 'README with Develop/Run instructions',
		category: 'docs',
		scope: 'all',
		description: 'A README that tells a newcomer how to install, test, and run the project.',
		realizations: { js: 'npm scripts', python: 'uv commands', go: 'go commands' },
	},
	{
		id: 'gitignore',
		title: 'Language-appropriate .gitignore',
		category: 'repo',
		scope: 'all',
		description: 'Ignores the language/toolchain build + cache artifacts.',
		realizations: { js: 'node_modules, dist', python: '.venv, __pycache__', go: 'bin, coverage' },
	},
	{
		id: 'editorconfig',
		title: 'Universal .editorconfig',
		category: 'repo',
		scope: 'all',
		description: 'Editor-agnostic indent/charset/newline settings, tuned to the language.',
		realizations: { js: '2-space', python: '4-space', go: 'tabs for *.go' },
	},
	{
		id: 'git-init',
		title: 'Initialize a git repository (+ initial commit)',
		category: 'repo',
		scope: 'all',
		description: 'The scaffolded directory is a git repo with an initial commit, ready to push.',
		realizations: { js: 'git init + commit', python: 'same', go: 'same' },
	},
	{
		id: 'ci',
		title: 'CI workflow running the project quality gate',
		category: 'ci',
		scope: 'all',
		description: 'A .github/workflows/ci.yml that runs the project’s own lint/type/test/build.',
		realizations: {
			js: 'npm ci → typecheck/lint/test/build',
			python: 'uv sync → ruff/mypy/pytest',
			go: 'gofmt/vet/build/test',
		},
	},
	{
		id: 'community',
		title: 'Community health files',
		category: 'docs',
		scope: 'all',
		description: 'CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, and issue + PR templates.',
		realizations: { js: 'language-neutral', python: 'same', go: 'same' },
	},
	{
		id: 'agent-guide',
		title: 'Agent guide (AGENTS.md + CLAUDE.md)',
		category: 'docs',
		scope: 'all',
		description: 'A short guide of the build/test commands for coding agents.',
		realizations: { js: 'npm commands', python: 'uv commands', go: 'go commands' },
	},
	{
		id: 'dependency-automation',
		title: 'Dependency-update automation',
		category: 'ci',
		scope: 'all',
		description: 'A Dependabot/Renovate config for the language’s package ecosystem.',
		realizations: { js: 'Renovate / npm', python: 'Dependabot (pip)', go: 'Dependabot (gomod)' },
	},
	{
		id: 'release',
		title: 'Release automation (idiomatic)',
		category: 'release',
		scope: 'publishable',
		description: 'A release path idiomatic to the language’s registry/distribution model.',
		realizations: {
			js: 'Changesets → npm',
			python: 'PyPI Trusted Publishing (OIDC)',
			go: 'GoReleaser + tag',
		},
	},
	{
		id: 'deployment-contract',
		title: 'Provider-neutral deployment contract (deployable targets)',
		category: 'deploy',
		scope: 'deployable',
		description:
			'Deployable presets emit a @packkit/core DeploymentContract a provider can act on.',
		realizations: {
			js: 'static/service/worker',
			python: 'service/worker/…',
			go: 'service/worker/…',
		},
	},
	{
		id: 'dockerfile',
		title: 'Dockerfile (containerizable targets)',
		category: 'deploy',
		scope: 'containerizable',
		description: 'Service/worker targets emit a Dockerfile matching the deployment contract.',
		realizations: { js: 'node base', python: 'python-slim', go: 'distroless multi-stage' },
	},
	{
		id: 'provenance',
		title: 'Provenance + upgrade baseline (packkit.json)',
		category: 'protocol',
		scope: 'all',
		description: 'A packkit.json recording generator/preset + a baseline for later upgrades.',
		realizations: { js: 'packkit.json', python: 'same', go: 'same' },
	},
	{
		id: 'conformance',
		title: 'Passes the conformance + embedded-lifecycle suites',
		category: 'protocol',
		scope: 'all',
		description: 'Implements PackkitGenerator and passes runGeneratorConformanceSuite + lifecycle.',
		realizations: { js: 'passes', python: 'passes', go: 'passes' },
	},
];

/** Just the ids — for quick membership checks and generator completeness tests. */
export const GENERATOR_CHECKLIST_IDS: readonly string[] = GENERATOR_CHECKLIST.map((i) => i.id);
