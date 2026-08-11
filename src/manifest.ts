// The load-bearing seam. Core does the file-level three-way diff (diff.ts); the
// STRUCTURED manifest semantics are pluggable per generator — package.json
// (scripts/dependencies/exports) for JS, pyproject.toml ([project]/optional-deps/
// entry-points) for Python. This is precisely where "accidentally modeling npm"
// would leak, so it stays an interface, never npm concepts baked into core.

import type { ChangeClassification } from './diff.js';

export interface ManifestChange extends ChangeClassification {
	/** Absent when newly added. */
	current?: unknown;
	generated: unknown;
}

/** A generator-owned structured diff of its manifest file. Shapes are the
 *  generator's own (JS returns scripts/deps sections; Python returns
 *  dependencies/entry-points) — core only requires the added/changed split. */
export interface ManifestDiffResult {
	added: Record<string, ManifestChange>;
	changed: Record<string, ManifestChange>;
}

export interface ManifestDiffer<Manifest = unknown> {
	/** The file this differ owns, e.g. "package.json" | "pyproject.toml". */
	readonly filename: string;
	parse(content: string): Manifest;
	serialize(manifest: Manifest): string;
	/** A structural snapshot stored in the baseline for later three-way diffing. */
	snapshot(manifest: Manifest): Record<string, unknown>;
	diff(input: { baseline?: Record<string, unknown>; current: Manifest; generated: Manifest }): ManifestDiffResult;
}
