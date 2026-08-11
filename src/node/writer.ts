import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { validateRelativePath } from '../paths.js';
import { PackkitCoreError } from '../errors.js';

// The one Node-only primitive. Lives under @packkit/core/node so importing the
// default entry never drags node:fs/path into a browser bundle. Every path is
// re-validated at this boundary (defence in depth) and nothing is overwritten
// unless `force` is set.
export function writeGeneratedProject(
	dir: string,
	files: Record<string, string>,
	options: { force?: boolean } = {},
): { written: string[]; skipped: string[] } {
	const root = resolve(dir);
	const written: string[] = [];
	const skipped: string[] = [];

	for (const [rawPath, content] of Object.entries(files)) {
		const check = validateRelativePath(rawPath);
		if (!check.ok) throw new PackkitCoreError(check.code, check.message);

		const abs = join(root, check.normalized);
		if (abs !== root && !abs.startsWith(root + sep)) {
			throw new PackkitCoreError('UNSAFE_PATH', `Refusing to write outside the target directory: "${rawPath}".`);
		}
		if (existsSync(abs) && !options.force) {
			skipped.push(check.normalized);
			continue;
		}
		mkdirSync(dirname(abs), { recursive: true });
		writeFileSync(abs, content);
		written.push(check.normalized);
	}
	return { written: written.sort(), skipped: skipped.sort() };
}
