# Changelog

All notable changes to `@packkit/core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Security workflow** — weekly + per-PR `npm audit` gate via the shared
  `PackkitJS/packkit-actions` `security@v1` workflow.

### Changed

- CI now runs via the shared `PackkitJS/packkit-actions` reusable workflow
  (`generator-ci@v1`). Added a standard `check` npm script (typecheck + lint +
  test + build + package validation) as the single language-agnostic CI entrypoint.

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

[Unreleased]: https://github.com/PackkitJS/packkit-core/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/PackkitJS/packkit-core/releases/tag/v0.1.2
[0.1.0]: https://github.com/PackkitJS/packkit-core/releases/tag/v0.1.0
