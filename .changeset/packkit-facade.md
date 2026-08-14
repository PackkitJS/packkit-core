---
'@packkit/core': minor
---

Add `createPackkit({ generators })` — a thin platform facade over a generator registry and the core lifecycle helpers. A host calls `listGenerators` / `listPresets` / `getSchema` / `generate` / `extend` / `digest` / `getDeploymentContract` / `exportDefinition` / `replay` / `upgrade`, and the owning generator is resolved from a project's `metadata.generatorId` or a definition's `generator.id` — so a portal or agent host integrates once and drives any language by id. Additive; the registry + standalone helpers remain fully usable. Capability-gated with clear errors.
