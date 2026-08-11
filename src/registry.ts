import type { PackkitGenerator } from './generator.js';
import { PackkitCoreError } from './errors.js';

// Explicit-registration only. No npm scanning, dynamic download, or arbitrary
// plugin execution — a community-plugin trust model (signing, sandboxing,
// permissions) is deferred until it's an actual product requirement.

export interface GeneratorRegistry {
	register(generator: PackkitGenerator): void;
	get(id: string): PackkitGenerator | undefined;
	has(id: string): boolean;
	list(): PackkitGenerator[];
}

export function createGeneratorRegistry(): GeneratorRegistry {
	const generators = new Map<string, PackkitGenerator>();
	return {
		register(generator) {
			if (!generator || typeof generator.id !== 'string' || generator.id.length === 0) {
				throw new PackkitCoreError('INVALID_GENERATOR', 'A generator must have a non-empty string id.');
			}
			if (generators.has(generator.id)) {
				throw new PackkitCoreError('DUPLICATE_GENERATOR', `A generator with id "${generator.id}" is already registered.`);
			}
			generators.set(generator.id, generator);
		},
		get: (id) => generators.get(id),
		has: (id) => generators.has(id),
		list: () => [...generators.values()],
	};
}
