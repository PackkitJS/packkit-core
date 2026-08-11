/** Stable, human-friendly stringify: 2-space indent + trailing newline.
 *  Deterministic — the universal serializer for packkit.json/provenance. */
export function toJson(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}
