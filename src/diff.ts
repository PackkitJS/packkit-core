// Universal file-level three-way classification for baseline-aware upgrades:
// compare a stored baseline (scaffold time), the current on-disk content, and
// what the generator produces today. This is language-independent — the
// *manifest* semantics (package.json vs pyproject.toml) live behind ManifestDiffer.

export type ChangeStatus = 'changed' | 'template-only-change' | 'user-only-change' | 'both-changed';

export interface ChangeClassification {
	status: ChangeStatus;
	/** True only for a template-only change (safe to apply — the user hadn't edited it). */
	safeToApply: boolean;
	reason: string;
}

/**
 * Classify a value that differs from the current template. Ported from
 * create-packkit so a project's upgrade behavior is unchanged after generators
 * import this from core.
 */
export function classifyChange(input: {
	hasBaseline: boolean;
	currentEqualsBaseline: boolean;
	generatedEqualsBaseline: boolean;
}): ChangeClassification {
	const { hasBaseline, currentEqualsBaseline, generatedEqualsBaseline } = input;
	if (!hasBaseline) {
		return { status: 'changed', safeToApply: false, reason: 'differs from the current template (no baseline to compare)' };
	}
	if (currentEqualsBaseline && !generatedEqualsBaseline) {
		return { status: 'template-only-change', safeToApply: true, reason: 'the template changed and you had not edited this' };
	}
	if (!currentEqualsBaseline && generatedEqualsBaseline) {
		return { status: 'user-only-change', safeToApply: false, reason: 'you edited this; the template did not change' };
	}
	return { status: 'both-changed', safeToApply: false, reason: 'both you and the template changed this' };
}
