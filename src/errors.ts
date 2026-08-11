/** Typed error for all @packkit/core failures, so callers can branch on `code`. */
export class PackkitCoreError extends Error {
	code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = 'PackkitCoreError';
		this.code = code;
	}
}
