// Provider-neutral deployment contracts. A generator describes how to build and
// run a project in these terms; a provider decides whether it supports the
// contract — compatibility is contract × provider, never language × provider.

export type DeploymentType = 'static' | 'service' | 'worker' | 'library' | 'cli' | 'fullstack';

export interface StaticDeploymentContract {
	type: 'static';
	buildCommand: string;
	outputDirectory: string;
}

/** A long-running HTTP service. Liveness is an HTTP port + health-check path.
 *  Language-neutral: `runtime` is a free string ('node', 'python-3.12', 'go-1.23',
 *  ...) exactly like the worker contract — a provider decides support from the
 *  contract shape, never the language. */
export interface ServiceDeploymentContract {
	type: 'service';
	runtime: string;
	buildCommand?: string;
	startCommand: string;
	defaultPort: number;
	portEnvironmentVariable: string;
	healthCheckPath: string;
	containerFile?: string;
	requiredEnvironmentVariables: string[];
	optionalEnvironmentVariables: string[];
}

/** A long-running non-HTTP process (queue/event worker). Liveness is a process
 *  or heartbeat convention, never an HTTP port. Transport-neutral. */
export interface WorkerDeploymentContract {
	type: 'worker';
	runtime: string;
	buildCommand?: string;
	startCommand: string;
	shutdown: { signals: string[]; drainsInflight: boolean };
	health: { type: 'process' | 'heartbeat'; heartbeatPath?: string };
	containerFile?: string;
	requiredEnvironmentVariables: string[];
	optionalEnvironmentVariables: string[];
}

export interface CliDeploymentContract {
	type: 'cli';
	buildCommand?: string;
}

export interface LibraryDeploymentContract {
	type: 'library';
	buildCommand?: string;
}

export interface FullstackDeploymentContract {
	type: 'fullstack';
	frontend: StaticDeploymentContract;
	backend: ServiceDeploymentContract;
}

export type DeploymentContract =
	| StaticDeploymentContract
	| ServiceDeploymentContract
	| WorkerDeploymentContract
	| CliDeploymentContract
	| LibraryDeploymentContract
	| FullstackDeploymentContract;

/** Deployable contracts a provider can act on; libraries/CLIs are non-deployable. */
export const DEPLOYABLE_TYPES: readonly DeploymentType[] = [
	'static',
	'service',
	'worker',
	'fullstack',
];

/** Structurally validate a deployment contract. Returns the offending reasons so
 *  a generator's conformance check can report precisely. */
export function validateDeploymentContract(contract: unknown): { ok: boolean; errors: string[] } {
	const errors: string[] = [];
	if (!contract || typeof contract !== 'object')
		return { ok: false, errors: ['contract is not an object'] };
	const c = contract as Record<string, unknown>;
	const req = (cond: boolean, msg: string) => {
		if (!cond) errors.push(msg);
	};
	const str = (v: unknown) => typeof v === 'string' && v.length > 0;
	const strArray = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');

	switch (c.type) {
		case 'static':
			req(str(c.buildCommand), 'static: buildCommand required');
			req(str(c.outputDirectory), 'static: outputDirectory required');
			break;
		case 'library':
		case 'cli':
			// buildCommand optional; nothing else required
			break;
		case 'service':
			req(str(c.runtime), 'service: runtime required');
			req(str(c.startCommand), 'service: startCommand required');
			req(typeof c.defaultPort === 'number', 'service: defaultPort required');
			req(str(c.portEnvironmentVariable), 'service: portEnvironmentVariable required');
			req(str(c.healthCheckPath), 'service: healthCheckPath required');
			req(
				strArray(c.requiredEnvironmentVariables),
				'service: requiredEnvironmentVariables must be string[]',
			);
			req(
				strArray(c.optionalEnvironmentVariables),
				'service: optionalEnvironmentVariables must be string[]',
			);
			break;
		case 'worker':
			req(str(c.runtime), 'worker: runtime required');
			req(str(c.startCommand), 'worker: startCommand required');
			req(typeof c.shutdown === 'object' && c.shutdown !== null, 'worker: shutdown required');
			req(typeof c.health === 'object' && c.health !== null, 'worker: health required');
			break;
		case 'fullstack': {
			const fe = validateDeploymentContract(c.frontend);
			const be = validateDeploymentContract(c.backend);
			if (!fe.ok) errors.push(...fe.errors.map((e) => `fullstack.frontend: ${e}`));
			if (!be.ok) errors.push(...be.errors.map((e) => `fullstack.backend: ${e}`));
			break;
		}
		default:
			errors.push(`unknown deployment type: ${JSON.stringify(c.type)}`);
	}
	return { ok: errors.length === 0, errors };
}
