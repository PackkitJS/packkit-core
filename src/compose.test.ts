import { describe, it, expect } from 'vitest';
import { composeFullstack } from './compose.js';
import { validateDeploymentContract } from './contracts.js';
import { PackkitCoreError } from './errors.js';
import type { GeneratedProject } from './generator.js';

const frontend: GeneratedProject = {
	config: { name: 'web' },
	files: { 'index.html': '<html></html>', 'package.json': '{}', 'src/main.tsx': 'render()' },
	diagnostics: [],
	metadata: { generatorId: 'javascript', protocolVersion: 1 },
	deploymentContract: { type: 'static', buildCommand: 'npm run build', outputDirectory: 'dist' },
};

const backend: GeneratedProject = {
	config: { name: 'api' },
	files: {
		'pyproject.toml': '[project]',
		Dockerfile: 'FROM python',
		'src/app.py': 'app = FastAPI()',
	},
	diagnostics: [],
	metadata: { generatorId: 'python', protocolVersion: 1 },
	deploymentContract: {
		type: 'service',
		runtime: 'python-3.12',
		buildCommand: 'uv build',
		startCommand: 'python -m app',
		defaultPort: 8000,
		portEnvironmentVariable: 'PORT',
		healthCheckPath: '/healthz',
		containerFile: 'Dockerfile',
		requiredEnvironmentVariables: [],
		optionalEnvironmentVariables: [],
	},
};

describe('composeFullstack', () => {
	it('merges the two trees under apps/web + apps/server with root files', () => {
		const { project } = composeFullstack({ frontend, backend });
		const paths = Object.keys(project.files).sort();
		expect(paths).toContain('apps/web/index.html');
		expect(paths).toContain('apps/web/src/main.tsx');
		expect(paths).toContain('apps/server/pyproject.toml');
		expect(paths).toContain('apps/server/src/app.py');
		expect(paths).toContain('README.md');
		expect(paths).toContain('.gitignore');
		expect(paths).toContain('docker-compose.yml');
	});

	it('emits a valid fullstack contract with root-relative sub-contracts', () => {
		const { project } = composeFullstack({ frontend, backend });
		const c = project.deploymentContract;
		expect(validateDeploymentContract(c).ok).toBe(true);
		expect(c.type).toBe('fullstack');
		if (c.type !== 'fullstack') throw new Error('unreachable');
		expect(c.frontend.outputDirectory).toBe('apps/web/dist');
		expect(c.frontend.buildCommand).toBe('cd apps/web && npm run build');
		expect(c.backend.startCommand).toBe('cd apps/server && python -m app');
		expect(c.backend.containerFile).toBe('apps/server/Dockerfile');
		expect(c.backend.runtime).toBe('python-3.12'); // language preserved in the runtime string
	});

	it('records what it was composed from (language-neutral metadata)', () => {
		const { project } = composeFullstack({ frontend, backend });
		expect(project.metadata.generatorId).toBe('fullstack');
		expect(project.metadata.composedFrom).toEqual({ frontend: 'javascript', backend: 'python' });
	});

	it('writes a docker-compose that runs the pair from the contracts (no language assumptions)', () => {
		const { project } = composeFullstack({ frontend, backend });
		const compose = project.files['docker-compose.yml'];
		expect(compose).toContain('build: ./apps/server');
		expect(compose).toContain('PORT: "8000"');
		expect(compose).toContain('- "8000:8000"');
		expect(compose).toContain('./apps/web/dist:/usr/share/nginx/html:ro');
	});

	it('honors custom directories and can skip docker-compose', () => {
		const { project } = composeFullstack({
			frontend,
			backend,
			options: { frontendDir: 'frontend', backendDir: 'backend', dockerCompose: false },
		});
		expect(Object.keys(project.files)).toContain('frontend/index.html');
		expect(Object.keys(project.files)).toContain('backend/Dockerfile');
		expect(project.files['docker-compose.yml']).toBeUndefined();
	});

	it('is deterministic', () => {
		expect(composeFullstack({ frontend, backend }).project.files).toEqual(
			composeFullstack({ frontend, backend }).project.files,
		);
	});

	it('rejects a non-static frontend and a non-service backend', () => {
		expect(() => composeFullstack({ frontend: backend, backend })).toThrow(PackkitCoreError);
		expect(() => composeFullstack({ frontend, backend: frontend })).toThrow(PackkitCoreError);
	});

	it('rejects colliding directories', () => {
		expect(() =>
			composeFullstack({ frontend, backend, options: { frontendDir: 'app', backendDir: 'app' } }),
		).toThrow(PackkitCoreError);
	});
});
