# @packkit/core

## 0.6.0

### Minor Changes

- e2d3b2f: Add `runProviderConformanceSuite` (in `@packkit/core/testing`) and the `PackkitProvider`
  contract — the executable definition of a well-behaved deployment provider, mirroring the
  generator suite. It checks a stable id, deterministic `supports()` with reason codes, a
  deterministic + JSON-serializable + schema-versioned `plan`, no leaked secrets, and that
  `apply` is present iff the `apply` capability is advertised (so an IaC-emitting provider
  like `provider-aws` can conform without a runtime apply). Providers supply a small harness
  (supported/unsupported contract + plan input) since they don't share one plan-input shape.

## 0.5.0

### Minor Changes

- 68e2bea: Add `composeFullstack({ frontend, backend, options })` — a language-neutral primitive
  that composes two independently-generated projects (a `static` frontend and a `service`
  backend) into one fullstack repo. It merges the trees under `apps/web/` + `apps/server/`,
  rewrites the sub-contracts to be root-relative, emits a neutral root `docker-compose.yml`
  (driven entirely by the contracts' ports/Dockerfiles/output dirs — no npm/uv/language
  assumptions) and a README, and carries the `fullstack` deployment contract so a provider
  deploys the pair from one definition. Core never learns "React" or "FastAPI", so
  React+FastAPI, React+Go, or Vue+Node all compose identically. Surfaces (web, MCP) build on
  this shared primitive.

## 0.4.0

### Minor Changes

- e099cd2: Generalize the service deployment contract to be language-neutral. The
  `NodeServiceDeploymentContract` (`type: 'node-service'`, `runtime: 'node'`) becomes
  `ServiceDeploymentContract` (`type: 'service'`, `runtime: string`) — mirroring the
  already-neutral `WorkerDeploymentContract`. A provider now decides service support from
  the contract shape, never from the language, so a Node, Python, or Go HTTP service all
  emit the same `service` contract (with `runtime` `'node'` / `'python-3.12'` / `'go-1.23'`).

  **Breaking** (deliberate; the last npm concept in core): `DeploymentType` drops
  `'node-service'` for `'service'`; `DEPLOYABLE_TYPES`, `FullstackDeploymentContract.backend`,
  `validateDeploymentContract`, and the exported type name change accordingly. Consumers
  emitting or matching `'node-service'` must switch to `'service'`.

## 0.3.0

### Minor Changes

- 2561a10: Add `createPackkit({ generators })` — a thin platform facade over a generator registry and the core lifecycle helpers. A host calls `listGenerators` / `listPresets` / `getSchema` / `generate` / `extend` / `digest` / `getDeploymentContract` / `exportDefinition` / `replay` / `upgrade`, and the owning generator is resolved from a project's `metadata.generatorId` or a definition's `generator.id` — so a portal or agent host integrates once and drives any language by id. Additive; the registry + standalone helpers remain fully usable. Capability-gated with clear errors.

## 0.2.0

### Minor Changes

- 4cb01e5: Universal embedding lifecycle primitives — the language-neutral core a host uses to drive any generator identically. All additive; nothing existing changes.

  - **`calculateGeneratedProjectDigest(project)`** — a stable, browser-safe identity digest (config + files, sorted, key-canonical); the same project yields the same digest across CLI, embedded, MCP, web, and replay.
  - **`extendGeneratedProject(project, { files })`** — generic host file extension with explicit `add`/`replace` intent, collision detection, path safety, and provenance carried on `GeneratedProject.extensions` so definition export/replay preserves intent. Structured manifest merges stay per-generator.
  - **`computeProjectUpgrade` / `summarizeFileUpgrade`** + the common **`UpgradeResult`** envelope (`{generatedProject, plan, patch, diagnostics, metadata}`) — one file-level upgrade vocabulary (unchanged / new-generated / removed-from-template / template-only / user-only / both-changed); generators attach their manifest diff via `plan.manifest`.
  - **`ProjectDefinition.baseline?`** and **`GeneratedProject.extensions?`** added to the canonical envelope (optional, backwards-compatible).
  - **`runEmbeddedLifecycleConformance(generator)`** in `@packkit/core/testing` — verifies digest stability, definition-replay determinism, host-extension survival, and the common upgrade envelope (with user-edit preservation), gated on advertised capabilities.

## 0.1.3

### Patch Changes

- 104705d: Adopt the shared PackkitLabs/packkit-actions CI: run `generator-ci@v1` via a standard `check` script and add a `security@v1` npm-audit gate. No API changes.

## [0.1.2] - 2026-08-12

### Changed

- `PackkitGenerator.manifestDiffers?` is now typed `ManifestDiffer<unknown, unknown>[]`
  instead of pinning the default `ManifestDiffResult`. Each differ owns its `Diff`
  shape (package.json sections vs pyproject entry-points), so a generator whose
  differ returns a richer diff (e.g. create-packkit-py's `pyprojectDiffer`) no
  longer needs an `as unknown as ManifestDiffer` cast to populate the array. A
  reader of the array gets `unknown` from `diff()` and narrows by the source
  generator. Backward-compatible: any existing `ManifestDiffer` is still assignable.

## [0.1.1] - 2026-08-12

### Added

- `PackkitGenerator.manifestDiffers?` — optional per-generator structured-manifest
  differs (the seam core keeps language semantics behind).
- `ManifestDiffer` gained a `Diff` type parameter (defaulting to `ManifestDiffResult`)
  so a generator's diff can be its own shape.

Both are backward-compatible (`^0.1.0` picks this up).

## [0.1.0] - 2026-08-11

Initial release of the versioned Packkit platform contract (Phase 2 of the
platform migration — see `create-packkit`'s `docs/PLATFORM.md`).

### Added

- **Platform contract:** `PACKKIT_PROTOCOL_VERSION`, the `PackkitGenerator`
  interface with capability negotiation and maturity status, the `ManifestDiffer`
  seam, and the deployment-contract types (including `Worker`), plus stable
  identifier and deprecation types.
- **Primitives:** deterministic content hashing, the file three-way diff,
  diagnostics, deterministic JSON rendering (`toJson`), path-safety validation,
  and an explicit-registration generator registry.
- **Subpath exports** that keep the package browser-safe by default: `.` (types,
  protocol, hashing, diffing, registry), `./node` (the filesystem writer and
  anything importing `node:*`), and `./testing` (the conformance suite).
- **Conformance suite** (`runGeneratorConformanceSuite`) — the executable
  definition of a Packkit-compatible generator.

[0.1.2]: https://github.com/PackkitLabs/packkit-core/releases/tag/v0.1.2
[0.1.0]: https://github.com/PackkitLabs/packkit-core/releases/tag/v0.1.0
