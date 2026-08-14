import type { Diagnostic } from './diagnostics.js';
import { validateRelativePath } from './paths.js';

// Generic file-level extension — the universal part of "a host layers its own
// files onto a generated project". Structured manifest merges (package.json for
// JS, pyproject.toml for Python) stay in each generator's facade; this owns only
// what is language-neutral: add-vs-replace intent, collision detection, path
// safety, and the provenance a definition needs to replay the same intent.

export type ExtensionMode = 'add' | 'replace';

/** One host-supplied file. `add` introduces a path the generator did NOT produce
 *  (a collision is an error — you didn't mean to overwrite); `replace` deliberately
 *  overrides generated output (and may create the file if absent). */
export interface FileExtension {
	mode: ExtensionMode;
	content: string;
}

export interface GeneratedProjectExtension {
	files?: Record<string, FileExtension>;
}

/** The provenance of an applied extension: the exact per-file intent, stored in a
 *  project definition so replay preserves `add` vs `replace` instead of
 *  re-deriving it against a (possibly newer) generated base. */
export interface AppliedExtension {
	files: Record<string, FileExtension>;
}

export interface ExtendResult<P> {
	/** The project with the extension merged into `files`. */
	project: P;
	/** Applied per-file intent — persist this in the definition's `extensions`. */
	extension: AppliedExtension;
	diagnostics: Diagnostic[];
}

/** Layer host-owned files onto a generated project. Pure — returns a new project;
 *  never writes to disk. Collisions and unsafe paths are reported as diagnostics
 *  (not thrown), and the offending file is left unapplied, so the returned project
 *  is always safe to use. Structured manifest merges are the caller's job. */
export function extendGeneratedProject<
	P extends { files: Record<string, string>; diagnostics?: Diagnostic[] },
>(project: P, extension: GeneratedProjectExtension = {}): ExtendResult<P> {
	const files = { ...project.files };
	const diagnostics: Diagnostic[] = [];
	const applied: Record<string, FileExtension> = {};
	const err = (code: string, field: string, message: string) =>
		diagnostics.push({ severity: 'error', code, field, message, source: 'extend' });

	for (const [rawPath, spec] of Object.entries(extension.files ?? {})) {
		if (!spec || typeof spec !== 'object' || typeof spec.content !== 'string') {
			err(
				'INVALID_EXTENSION_FILE',
				rawPath,
				`Extension file "${rawPath}" must be { mode, content: string }.`,
			);
			continue;
		}
		const mode: ExtensionMode = spec.mode === 'replace' ? 'replace' : 'add';
		const res = validateRelativePath(rawPath);
		if (!res.ok) {
			err('UNSAFE_EXTENSION_PATH', rawPath, res.message);
			continue;
		}
		const path = res.normalized;
		const collides = path in files;
		if (mode === 'add' && collides) {
			// A declared `add` must never silently clobber generated output — surface
			// it. This is also how definition replay under a newer generator detects
			// that an added path is now generated.
			err(
				'EXTENSION_FILE_COLLISION',
				path,
				`Extension adds "${path}", but the generated project already contains it. Use mode "replace" to override it deliberately.`,
			);
			continue;
		}
		if (mode === 'replace' && !collides) {
			diagnostics.push({
				severity: 'info',
				code: 'EXTENSION_REPLACE_ADDED',
				field: path,
				message: `Extension replaces "${path}", which the generator did not produce; it was added.`,
				source: 'extend',
			});
		}
		files[path] = spec.content;
		applied[path] = { mode, content: spec.content };
	}

	// Accumulate onto the project so a chain of extends composes and the generator's
	// exportDefinition can persist the full applied intent. `extension` (below) is
	// just this call's delta.
	const priorFiles = (project as { extensions?: AppliedExtension }).extensions?.files ?? {};
	const accumulated: AppliedExtension = { files: { ...priorFiles, ...applied } };

	return {
		project: {
			...project,
			files,
			diagnostics: [...(project.diagnostics ?? []), ...diagnostics],
			extensions: accumulated,
		} as P,
		extension: { files: applied },
		diagnostics,
	};
}
