// A small, deterministic, browser-safe content hash for baseline change
// detection. Not cryptographic — it only needs to tell whether a generated
// file's content has changed since scaffold time, which a well-distributed
// 53-bit hash does. Core runs in the browser too, so this can't use node:crypto.
//
// cyrb53 (public domain) with a fixed seed. Ported verbatim from create-packkit
// so a project's packkit.json baseline hashes stay byte-identical after the
// generators start importing it from here.
export function contentHash(str: string): string {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
	return n.toString(16).padStart(14, '0');
}
