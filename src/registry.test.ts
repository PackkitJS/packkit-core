import { describe, it, expect } from 'vitest';
import { createGeneratorRegistry } from './registry.js';
import { PackkitCoreError } from './errors.js';
import type { PackkitGenerator } from './generator.js';

const stub = (id: string): PackkitGenerator => ({
	id,
	language: id,
	version: '0.0.0',
	maturity: 'experimental',
	protocol: { version: 1, capabilities: ['generate'] },
	listPresets: () => [],
	getSchema: () => ({ schemaVersion: 1, generatorId: id, options: [] }),
	createProject: () => ({ config: {}, files: {}, diagnostics: [], metadata: { generatorId: id, protocolVersion: 1 }, deploymentContract: { type: 'library' } }),
});

describe('createGeneratorRegistry', () => {
	it('registers, gets, lists, and reports membership', () => {
		const reg = createGeneratorRegistry();
		reg.register(stub('javascript'));
		reg.register(stub('python'));
		expect(reg.has('python')).toBe(true);
		expect(reg.get('javascript')?.id).toBe('javascript');
		expect(reg.list().map((g) => g.id).sort()).toEqual(['javascript', 'python']);
	});

	it('rejects duplicate ids and invalid generators', () => {
		const reg = createGeneratorRegistry();
		reg.register(stub('js'));
		expect(() => reg.register(stub('js'))).toThrow(PackkitCoreError);
		expect(() => reg.register({ id: '' } as unknown as PackkitGenerator)).toThrow(PackkitCoreError);
	});
});
