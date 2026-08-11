// Phase-2 acceptance criterion: importing @packkit/core (the default entry) must
// not transitively load any `node:` builtin, so a browser bundle stays clean.
// This statically walks the import graph from src/index.ts over the .ts sources.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function reachableSources(entry: string): string[] {
	const seen = new Set<string>();
	const stack = [entry];
	while (stack.length) {
		const file = stack.pop();
		if (!file || seen.has(file) || !existsSync(file)) continue;
		seen.add(file);
		const src = readFileSync(file, 'utf8');
		for (const match of src.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
			const spec = match[1];
			if (!spec) continue;
			stack.push(resolve(dirname(file), spec.replace(/\.js$/, '.ts')));
		}
	}
	return [...seen];
}

describe('browser safety', () => {
	it('the default entry (@packkit/core) imports no node: builtins', () => {
		const offenders = reachableSources(resolve(HERE, 'index.ts')).filter((file) => {
			const src = readFileSync(file, 'utf8');
			return /from\s+['"]node:/.test(src) || /require\(\s*['"]node:/.test(src);
		});
		expect(offenders).toEqual([]);
	});
});
