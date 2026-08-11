import type { Diagnostic } from './diagnostics.js';

// Path validation for generated and extension-supplied files. Every path that
// could reach the filesystem passes through here, so a host embedding Packkit can
// accept file maps from less-trusted sources (extensions, stored definitions)
// without opening a path-traversal hole.
//
// Browser-safe by design: it uses a pure relative-path normalizer rather than
// node:path, so it belongs in core's default (browser) entry. The normalizer
// matches posix.normalize for realistic repo-relative paths.

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

export type PathValidation = { ok: true; normalized: string } | { ok: false; code: string; message: string };

/** Validate a repo-relative file path. Pure — never touches the filesystem. */
export function validateRelativePath(path: string): PathValidation {
	if (typeof path !== 'string' || path.length === 0) {
		return fail('EMPTY_PATH', 'A file path must be a non-empty string.');
	}
	if (path.includes('\0')) {
		return fail('NULL_BYTE', `Path contains a null byte: ${JSON.stringify(path)}`);
	}
	// Treat backslashes as separators so a Windows-style path can't smuggle a
	// segment past the checks below on a POSIX host.
	const unified = path.replace(/\\/g, '/');
	if (/^[a-zA-Z]:/.test(unified) || unified.startsWith('/')) {
		return fail('ABSOLUTE_PATH', `Path must be relative, not absolute: ${path}`);
	}

	const normalized = normalizeRelative(unified);
	if (normalized === '.' || normalized === '' || normalized.endsWith('/')) {
		return fail('NOT_A_FILE', `Path does not name a file: ${path}`);
	}
	if (normalized === '..' || normalized.startsWith('../')) {
		return fail('PATH_ESCAPE', `Path escapes the destination directory: ${path}`);
	}
	for (const segment of normalized.split('/')) {
		if (WINDOWS_RESERVED.test(segment)) {
			return fail('WINDOWS_RESERVED', `Path uses a Windows-reserved name: ${path}`);
		}
	}
	return { ok: true, normalized };
}

/** Validate a whole file map: normalized paths + one diagnostic per invalid path
 *  and per case-insensitive collision. */
export function validatePathMap(files: Record<string, unknown>): { paths: Record<string, string>; diagnostics: Diagnostic[] } {
	const paths: Record<string, string> = {};
	const diagnostics: Diagnostic[] = [];
	const lowered = new Map<string, string>();

	for (const original of Object.keys(files)) {
		const res = validateRelativePath(original);
		if (!res.ok) {
			diagnostics.push({ severity: 'error', code: res.code, message: res.message, source: 'path', field: original });
			continue;
		}
		paths[original] = res.normalized;
		const key = res.normalized.toLowerCase();
		const seen = lowered.get(key);
		if (seen !== undefined && seen !== res.normalized) {
			diagnostics.push({
				severity: 'error',
				code: 'CASE_INSENSITIVE_COLLISION',
				message: `"${original}" and "${seen}" are the same file on a case-insensitive filesystem.`,
				source: 'path',
				field: original,
			});
		} else {
			lowered.set(key, res.normalized);
		}
	}
	return { paths, diagnostics };
}

// Pure relative-path normalizer — a browser-safe stand-in for posix.normalize
// over the paths a generator can produce (collapses '.'/'//'/'..', keeps a
// trailing slash so it can be rejected as not-a-file).
function normalizeRelative(input: string): string {
	const trailingSlash = input.length > 1 && input.endsWith('/');
	const stack: string[] = [];
	for (const segment of input.split('/')) {
		if (segment === '' || segment === '.') continue;
		if (segment === '..') {
			if (stack.length && stack[stack.length - 1] !== '..') stack.pop();
			else stack.push('..');
		} else {
			stack.push(segment);
		}
	}
	let out = stack.join('/');
	if (out === '') out = '.';
	if (trailingSlash && out !== '.' && !out.endsWith('/')) out += '/';
	return out;
}

function fail(code: string, message: string): PathValidation {
	return { ok: false, code, message };
}
