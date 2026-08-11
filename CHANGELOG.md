# Changelog

All notable changes to `@packkit/core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/PackkitJS/packkit-core/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/PackkitJS/packkit-core/releases/tag/v0.1.0
