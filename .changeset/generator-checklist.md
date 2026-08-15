---
'@packkit/core': minor
---

Add `GENERATOR_CHECKLIST` — the canonical, machine-readable list of capabilities every
Packkit generator must provide, each realized idiomatically per language (JS ESLint ≈
Python ruff ≈ Go gofmt; JS Changesets ≈ Python PyPI Trusted Publishing ≈ Go GoReleaser).
It's the onboarding contract so a new language ships complete on day one and Python/Go are
never afterthoughts. Exported alongside `GENERATOR_CHECKLIST_IDS` and the
`GeneratorChecklistItem` types, with a `docs/GENERATOR-CHECKLIST.md` realization matrix.
