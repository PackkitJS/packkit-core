import type { GeneratedProject } from './generator.js';
import type { Diagnostic } from './diagnostics.js';
import type {
	FullstackDeploymentContract,
	ServiceDeploymentContract,
	StaticDeploymentContract,
} from './contracts.js';
import { PACKKIT_PROTOCOL_VERSION } from './protocol.js';
import { PackkitCoreError } from './errors.js';
import { validateRelativePath } from './paths.js';

// Compose two independently-generated projects — a `static` frontend and a `service`
// backend — into one fullstack repo. LANGUAGE-NEUTRAL: this never learns "React" or
// "FastAPI"; it only reads the provider-neutral deployment contracts, so React+FastAPI,
// React+Go, or Vue+Node all compose identically. The result carries the `fullstack`
// deployment contract, so a provider deploys the pair from one project.

export interface ComposeFullstackOptions {
	/** Subdirectory for the frontend. Default `apps/web` (matches the JS fullstack layout). */
	frontendDir?: string;
	/** Subdirectory for the backend. Default `apps/server`. */
	backendDir?: string;
	/** Repo name, used only in the root README heading. */
	name?: string;
	/** Emit a root docker-compose.yml that runs the pair locally. Default true. */
	dockerCompose?: boolean;
}

export interface ComposeFullstackResult {
	project: GeneratedProject;
	diagnostics: Diagnostic[];
}

export function composeFullstack({
	frontend,
	backend,
	options = {},
}: {
	frontend: GeneratedProject;
	backend: GeneratedProject;
	options?: ComposeFullstackOptions;
}): ComposeFullstackResult {
	const feContract = frontend.deploymentContract;
	const beContract = backend.deploymentContract;
	if (feContract?.type !== 'static') {
		throw new PackkitCoreError(
			'FULLSTACK_FRONTEND_NOT_STATIC',
			`The frontend must have a 'static' deployment contract; got '${feContract?.type}'.`,
		);
	}
	if (beContract?.type !== 'service') {
		throw new PackkitCoreError(
			'FULLSTACK_BACKEND_NOT_SERVICE',
			`The backend must have a 'service' deployment contract; got '${beContract?.type}'.`,
		);
	}

	const frontendDir = normalizeDir(options.frontendDir ?? 'apps/web');
	const backendDir = normalizeDir(options.backendDir ?? 'apps/server');
	if (frontendDir === backendDir) {
		throw new PackkitCoreError(
			'FULLSTACK_DIR_COLLISION',
			'frontendDir and backendDir must differ.',
		);
	}

	// Merge the two trees under their subdirectories. Distinct prefixes mean no
	// collisions; validateRelativePath guards against path escapes.
	const files: Record<string, string> = {};
	for (const [rel, contents] of Object.entries(frontend.files)) {
		files[joinValidated(frontendDir, rel)] = contents;
	}
	for (const [rel, contents] of Object.entries(backend.files)) {
		files[joinValidated(backendDir, rel)] = contents;
	}

	const contract = fullstackContract(feContract, beContract, frontendDir, backendDir);

	files['README.md'] = rootReadme(options.name, frontendDir, backendDir, contract);
	files['.gitignore'] = rootGitignore();
	if (options.dockerCompose !== false) {
		files['docker-compose.yml'] = dockerCompose(feContract, beContract, frontendDir, backendDir);
	}

	const project: GeneratedProject = {
		config: {
			frontendDir,
			backendDir,
			frontend: frontend.config,
			backend: backend.config,
		},
		files,
		diagnostics: [...frontend.diagnostics, ...backend.diagnostics],
		metadata: {
			generatorId: 'fullstack',
			protocolVersion: PACKKIT_PROTOCOL_VERSION,
			composedFrom: {
				frontend: frontend.metadata.generatorId,
				backend: backend.metadata.generatorId,
			},
		},
		deploymentContract: contract,
	};

	return { project, diagnostics: project.diagnostics };
}

// The fullstack contract with sub-contract commands/paths rewritten to run from the
// composed repo root (so a provider or human can act on it without extra context).
function fullstackContract(
	fe: StaticDeploymentContract,
	be: ServiceDeploymentContract,
	frontendDir: string,
	backendDir: string,
): FullstackDeploymentContract {
	const cd = (dir: string, cmd: string) => `cd ${dir} && ${cmd}`;
	return {
		type: 'fullstack',
		frontend: {
			type: 'static',
			buildCommand: cd(frontendDir, fe.buildCommand),
			outputDirectory: `${frontendDir}/${fe.outputDirectory}`,
		},
		backend: {
			...be,
			buildCommand: be.buildCommand ? cd(backendDir, be.buildCommand) : undefined,
			startCommand: cd(backendDir, be.startCommand),
			containerFile: be.containerFile ? `${backendDir}/${be.containerFile}` : undefined,
		},
	};
}

// A root docker-compose that runs the pair locally, expressed only through the
// contracts: the backend from its Dockerfile on its port, the frontend served by nginx
// from its built output. No npm/uv/language assumptions.
function dockerCompose(
	fe: StaticDeploymentContract,
	be: ServiceDeploymentContract,
	frontendDir: string,
	backendDir: string,
): string {
	const port = be.defaultPort;
	const portEnv = be.portEnvironmentVariable;
	const dockerfile = be.containerFile ?? 'Dockerfile';
	const build =
		dockerfile === 'Dockerfile'
			? `    build: ./${backendDir}`
			: `    build:\n      context: ./${backendDir}\n      dockerfile: ${dockerfile}`;
	return `# Local dev for the fullstack pair. Build the frontend first (see README),
# then: docker compose up
services:
  server:
${build}
    environment:
      ${portEnv}: "${port}"
    ports:
      - "${port}:${port}"

  web:
    image: nginx:alpine
    depends_on:
      - server
    ports:
      - "8080:80"
    volumes:
      - ./${frontendDir}/${fe.outputDirectory}:/usr/share/nginx/html:ro
`;
}

function rootReadme(
	name: string | undefined,
	frontendDir: string,
	backendDir: string,
	contract: FullstackDeploymentContract,
): string {
	const port = contract.backend.defaultPort;
	return `# ${name ?? 'Fullstack app'}

A fullstack project composed by [Packkit](https://packkit-web.pages.dev/): a static
frontend and an HTTP service backend, deployed from one \`fullstack\` deployment contract.

\`\`\`text
${frontendDir}/     # frontend (static) — build output is served as static files
${backendDir}/      # backend (service, ${contract.backend.runtime}) — listens on ${port}, health at ${contract.backend.healthCheckPath}
docker-compose.yml  # run the pair locally
\`\`\`

## Run locally

Each app keeps its own toolchain — develop them independently in \`${frontendDir}\` and
\`${backendDir}\`. To run the pair together with Docker:

\`\`\`sh
# 1. build the frontend so there's static output to serve
(cd ${frontendDir} && ${contract.frontend.buildCommand.split('&& ')[1] ?? 'build'})
# 2. bring the pair up (backend on :${port}, frontend on :8080)
docker compose up --build
\`\`\`

## Deploy

The project's deployment contract is \`fullstack\` — a \`static\` frontend plus a
\`service\` backend. A Packkit provider (e.g. \`@packkit/provider-aws\`) can consume it to
deploy the frontend to a CDN and the backend to a container runtime from one definition.
`;
}

function rootGitignore(): string {
	return `# Root-level; each app has its own .gitignore too.
node_modules/
dist/
.env
.DS_Store
`;
}

// A subdirectory path: no leading/trailing slash, no escapes.
function normalizeDir(dir: string): string {
	const trimmed = dir.replace(/^\/+|\/+$/g, '');
	validateRelativePath(`${trimmed}/x`);
	return trimmed;
}

function joinValidated(dir: string, rel: string): string {
	const path = `${dir}/${rel}`;
	validateRelativePath(path);
	return path;
}
