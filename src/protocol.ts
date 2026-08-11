// The ecosystem contract version — deliberately separate from @packkit/core's
// package version. Core can release 1.4.0 without changing the protocol; only a
// genuinely incompatible contract bumps this. Generators, definitions, and
// provenance all carry it so independently-released repos can tell whether they
// actually understand one another.
export const PACKKIT_PROTOCOL_VERSION = 1;
