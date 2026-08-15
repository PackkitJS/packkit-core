# Generator capability checklist

The contract every Packkit generator fulfils. Each capability is realized **idiomatically
for its language** — not copied. The point is _consistency of what we offer_, never
sameness of implementation: JS ESLint ≈ Python ruff ≈ Go gofmt; JS Changesets ≈ Python
PyPI Trusted Publishing ≈ Go GoReleaser.

**Python and Go are not afterthoughts.** A new language (Rust next?) is onboarded by
implementing this whole list on day one, each item the way that language does it. The
machine-readable source of truth is [`GENERATOR_CHECKLIST`](../src/checklist.ts) in
`@packkit/core`; this doc is its realization matrix.

## Realization matrix

| Capability                                                        | JavaScript                           | Python                               | Go                        |
| ----------------------------------------------------------------- | ------------------------------------ | ------------------------------------ | ------------------------- |
| Source layout + public API                                        | `src/index.ts`                       | `src/<pkg>/__init__.py` + `py.typed` | `<pkg>.go` at module root |
| Tests + runner                                                    | Vitest                               | pytest                               | `go test` (table tests)   |
| Lint + format                                                     | ESLint + Prettier                    | ruff                                 | gofmt                     |
| Typecheck                                                         | `tsc --noEmit`                       | `mypy --strict`                      | (compiler)                |
| License (MIT · Apache-2.0 · ISC · none)                           | ✅                                   | ✅                                   | ✅                        |
| README (Develop/Run)                                              | npm scripts                          | uv commands                          | go commands               |
| `.gitignore`                                                      | node_modules, dist                   | `.venv`, `__pycache__`               | bin, coverage             |
| `.editorconfig`                                                   | 2-space                              | 4-space                              | tabs for `*.go`           |
| git init + initial commit                                         | ✅                                   | ✅                                   | ✅                        |
| CI workflow (`ci.yml`)                                            | `npm ci` → typecheck/lint/test/build | `uv sync` → ruff/mypy/pytest         | gofmt/vet/build/test      |
| Community files (CONTRIBUTING, CoC, SECURITY, issue/PR templates) | ✅                                   | ✅                                   | ✅                        |
| Agent guide (`AGENTS.md`, `CLAUDE.md`)                            | npm commands                         | uv commands                          | go commands               |
| Dependency automation                                             | Renovate                             | Dependabot (pip)                     | Dependabot (gomod)        |
| Release automation                                                | Changesets → npm                     | PyPI Trusted Publishing (OIDC)       | GoReleaser + tag          |
| Deployment contract (deployable targets)                          | ✅                                   | ✅                                   | ✅                        |
| Dockerfile (containerizable targets)                              | node base                            | python-slim                          | distroless multi-stage    |
| Provenance + upgrade baseline (`packkit.json`)                    | ✅                                   | ✅                                   | ✅                        |
| Passes conformance + lifecycle suites                             | ✅                                   | ✅                                   | ✅                        |

## Scopes

Not every item applies to every preset — the `scope` field says when:

- **all** — every generated project.
- **deployable** — only presets that deploy (service, worker, static): the deployment contract.
- **containerizable** — only service/worker: the Dockerfile.
- **publishable** — only presets meant to be distributed: release automation (may be opt-in).

## Onboarding a new language

Adding a language is an operational checklist, not an architecture project. Implement each
`GENERATOR_CHECKLIST` item idiomatically, then prove it:

1. `PackkitGenerator` implementation + stable generator id.
2. Preset & schema discovery (stable ids, maturity).
3. Every capability above, realized the language's way.
4. Deterministic output + `packkit.json` provenance/baseline.
5. Baseline-aware upgrade (its own `ManifestDiffer`).
6. Web + MCP support (register the generator).
7. Shared CI + weekly freshness + a generated-project integration matrix.
8. **Passes `runGeneratorConformanceSuite` + `runEmbeddedLifecycleConformance`.**
9. A completeness test that asserts the emitted project covers the `all`-scope items.

When every box is checked, the language is a first-class Packkit citizen — same offer as
the others, no afterthoughts.
