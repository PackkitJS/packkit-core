---
'@packkit/core': minor
---

Universal embedding lifecycle primitives — the language-neutral core a host uses to drive any generator identically. All additive; nothing existing changes.

- **`calculateGeneratedProjectDigest(project)`** — a stable, browser-safe identity digest (config + files, sorted, key-canonical); the same project yields the same digest across CLI, embedded, MCP, web, and replay.
- **`extendGeneratedProject(project, { files })`** — generic host file extension with explicit `add`/`replace` intent, collision detection, path safety, and provenance carried on `GeneratedProject.extensions` so definition export/replay preserves intent. Structured manifest merges stay per-generator.
- **`computeProjectUpgrade` / `summarizeFileUpgrade`** + the common **`UpgradeResult`** envelope (`{generatedProject, plan, patch, diagnostics, metadata}`) — one file-level upgrade vocabulary (unchanged / new-generated / removed-from-template / template-only / user-only / both-changed); generators attach their manifest diff via `plan.manifest`.
- **`ProjectDefinition.baseline?`** and **`GeneratedProject.extensions?`** added to the canonical envelope (optional, backwards-compatible).
- **`runEmbeddedLifecycleConformance(generator)`** in `@packkit/core/testing` — verifies digest stability, definition-replay determinism, host-extension survival, and the common upgrade envelope (with user-edit preservation), gated on advertised capabilities.
