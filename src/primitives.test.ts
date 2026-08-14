import { describe, it, expect } from 'vitest';
import { contentHash } from './hash.js';
import { toJson } from './render.js';
import { validateRelativePath, validatePathMap } from './paths.js';
import { classifyChange } from './diff.js';
import { validateDeploymentContract } from './contracts.js';

describe('contentHash', () => {
	// Golden values pinned from create-packkit's implementation — the port MUST
	// stay byte-exact, or a project's packkit.json baseline hashes would drift
	// once the generators import it from here.
	it('matches create-packkit byte-for-byte', () => {
		expect(contentHash('packkit')).toBe('0bc7ec5901c8f4');
		expect(contentHash('')).toBe('0bdcb81aee8d83');
		expect(contentHash('the quick brown fox')).toBe('01c6866ad29b02');
	});
	it('is deterministic, 14 hex chars, well-distributed', () => {
		expect(contentHash('a')).toBe(contentHash('a'));
		expect(contentHash('a')).toMatch(/^[0-9a-f]{14}$/);
		expect(contentHash('a')).not.toBe(contentHash('b'));
	});
});

describe('toJson', () => {
	it('is 2-space indented with a trailing newline', () => {
		expect(toJson({ a: 1 })).toBe('{\n  "a": 1\n}\n');
	});
});

describe('validateRelativePath', () => {
	it('accepts normal repo-relative paths', () => {
		expect(validateRelativePath('src/index.ts')).toEqual({ ok: true, normalized: 'src/index.ts' });
		expect(validateRelativePath('.github/workflows/ci.yml').ok).toBe(true);
	});
	it('normalizes . and // like posix', () => {
		expect(validateRelativePath('./a//b')).toEqual({ ok: true, normalized: 'a/b' });
		expect(validateRelativePath('a/./b/../c')).toEqual({ ok: true, normalized: 'a/c' });
	});
	it('rejects unsafe paths', () => {
		expect(validateRelativePath('/etc/passwd').ok).toBe(false);
		expect(validateRelativePath('../escape').ok).toBe(false);
		expect(validateRelativePath('a/../../b').ok).toBe(false);
		expect(validateRelativePath('C:\\win').ok).toBe(false);
		expect(validateRelativePath('con.txt').ok).toBe(false);
		expect(validateRelativePath('a\0b').ok).toBe(false);
		expect(validateRelativePath('dir/').ok).toBe(false);
	});
	it('flags case-insensitive collisions in a map', () => {
		const { diagnostics } = validatePathMap({ 'A.txt': 'x', 'a.txt': 'y' });
		expect(diagnostics.some((d) => d.code === 'CASE_INSENSITIVE_COLLISION')).toBe(true);
	});
});

describe('classifyChange', () => {
	it('is safe to apply only for a template-only change', () => {
		expect(
			classifyChange({
				hasBaseline: true,
				currentEqualsBaseline: true,
				generatedEqualsBaseline: false,
			}),
		).toMatchObject({ status: 'template-only-change', safeToApply: true });
		expect(
			classifyChange({
				hasBaseline: true,
				currentEqualsBaseline: false,
				generatedEqualsBaseline: true,
			}),
		).toMatchObject({ status: 'user-only-change', safeToApply: false });
		expect(
			classifyChange({
				hasBaseline: true,
				currentEqualsBaseline: false,
				generatedEqualsBaseline: false,
			}),
		).toMatchObject({ status: 'both-changed', safeToApply: false });
		expect(
			classifyChange({
				hasBaseline: false,
				currentEqualsBaseline: false,
				generatedEqualsBaseline: false,
			}),
		).toMatchObject({ status: 'changed', safeToApply: false });
	});
});

describe('validateDeploymentContract', () => {
	it('accepts valid contracts', () => {
		expect(
			validateDeploymentContract({
				type: 'static',
				buildCommand: 'npm run build',
				outputDirectory: 'dist',
			}).ok,
		).toBe(true);
		expect(validateDeploymentContract({ type: 'library' }).ok).toBe(true);
		expect(
			validateDeploymentContract({
				type: 'worker',
				runtime: 'node',
				startCommand: 'npm start',
				shutdown: { signals: ['SIGTERM'], drainsInflight: true },
				health: { type: 'process' },
				requiredEnvironmentVariables: [],
				optionalEnvironmentVariables: [],
			}).ok,
		).toBe(true);
	});
	it("accepts a service contract for any language runtime (it's language-neutral)", () => {
		const service = (runtime: string) => ({
			type: 'service',
			runtime,
			startCommand: 'run',
			defaultPort: 8080,
			portEnvironmentVariable: 'PORT',
			healthCheckPath: '/healthz',
			requiredEnvironmentVariables: [],
			optionalEnvironmentVariables: [],
		});
		for (const runtime of ['node', 'python-3.12', 'go-1.23']) {
			expect(validateDeploymentContract(service(runtime)).ok).toBe(true);
		}
		// runtime is required, but not pinned to any particular language.
		expect(validateDeploymentContract(service('')).ok).toBe(false);
	});
	it('rejects invalid or unknown contracts with reasons', () => {
		expect(validateDeploymentContract({ type: 'static' }).ok).toBe(false);
		expect(validateDeploymentContract({ type: 'nope' }).errors[0]).toMatch(
			/unknown deployment type/,
		);
		expect(validateDeploymentContract({ type: 'node-service' }).errors[0]).toMatch(
			/unknown deployment type/,
		);
		expect(validateDeploymentContract(null).ok).toBe(false);
	});
});
