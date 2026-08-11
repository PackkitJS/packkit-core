export type DiagnosticSeverity = 'info' | 'warning' | 'error';

/** A structured, machine-readable finding surfaced during resolution, generation,
 *  path validation, or upgrade planning. Shared across every generator. */
export interface Diagnostic {
	severity: DiagnosticSeverity;
	code: string;
	message: string;
	field?: string;
	source?: string;
	previousValue?: unknown;
	resolvedValue?: unknown;
}
