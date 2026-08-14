import { contentHash } from './hash.js';

/** Canonical serialization for the digest: object keys sorted recursively so the
 *  same config produces the same string regardless of how a host ordered its keys.
 *  Array order is preserved (it is meaningful, e.g. `target: ['library']`). This is
 *  intentionally NOT `toJson` — that one is the byte-exact file serializer and must
 *  stay insertion-ordered so generated packkit.json output never shifts. */
function stableStringify(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
	const obj = value as Record<string, unknown>;
	return `{${Object.keys(obj)
		.sort()
		.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
		.join(',')}}`;
}

/** A stable identity digest of a generated project — its config plus every file's
 *  contents, independent of filesystem/enumeration order AND config key order.
 *  Deterministic and browser-safe: the same project yields the same digest across
 *  the CLI, the embedded API, MCP, the web, and a replayed definition. It is a
 *  canonical IDENTITY, not a security boundary (non-cryptographic), and never
 *  includes secrets — only what a generator deterministically produces from config.
 *
 *  Deliberately covers `config` + `files` only: diagnostics and metadata carry
 *  non-deterministic or environmental data, and the deployment contract is itself
 *  derived from config, so including them would add noise, not identity. */
export function calculateGeneratedProjectDigest(project: {
	config: Record<string, unknown>;
	files: Record<string, string>;
}): string {
	// One canonical string with unambiguous separators; files in sorted order,
	// config keys canonically sorted.
	let canonical = `config\0${stableStringify(project.config)}`;
	for (const path of Object.keys(project.files).sort()) {
		canonical += `\0file\0${path}\0${project.files[path]}`;
	}
	// Two independent cyrb53 passes — the plain hash plus one over a salt-prefixed
	// variant — widen the digest to ~106 bits so it reads as a stable identity
	// rather than a short checksum, while staying sync + browser-safe (no node:crypto).
	const SALT = 'packkit-digest-v1\0';
	return contentHash(canonical) + contentHash(SALT + canonical);
}
