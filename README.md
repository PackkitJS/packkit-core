# @packkit/core 📦

> The versioned [Packkit](https://github.com/PackkitJS) platform contract — primitives, protocol, and an executable conformance suite. Language-agnostic; **browser-safe by default**.

[![npm](https://img.shields.io/npm/v/@packkit/core.svg)](https://www.npmjs.com/package/@packkit/core) [![CI](https://github.com/PackkitJS/packkit-core/actions/workflows/ci.yml/badge.svg)](https://github.com/PackkitJS/packkit-core/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

`packkit-core` owns the **universal Packkit protocol** and nothing language-specific.
It knows nothing about npm, `package.json`, `pyproject.toml`, frameworks, or provider
APIs. Language generators (`create-packkit`, `create-packkit-py`, …) implement its
contract; MCP, the web configurator, and providers consume it.

## Entry points

| Import | Contents | Environment |
| --- | --- | --- |
| `@packkit/core` | Types, `PACKKIT_PROTOCOL_VERSION`, `contentHash`, `validateRelativePath`, `classifyChange`, deployment-contract types + `validateDeploymentContract`, `PackkitGenerator`/`ManifestDiffer` interfaces, `createGeneratorRegistry` | **browser-safe** — imports no `node:*` (asserted in CI) |
| `@packkit/core/node` | `writeGeneratedProject` (filesystem) | Node |
| `@packkit/core/testing` | `runGeneratorConformanceSuite`, `generatorConformanceChecks` | dev/test |

## The protocol

A generator advertises a **protocol version** (separate from this package's semver)
and the **capabilities** it actually implements, so consumers degrade gracefully:

```ts
import type { PackkitGenerator } from '@packkit/core';

const gen: PackkitGenerator = {
  id: 'python', language: 'python', version: '1.0.0', maturity: 'stable',
  protocol: { version: 1, capabilities: ['generate', 'deployment-contract', 'project-definition', 'baseline-upgrade'] },
  listPresets() { /* … */ }, getSchema() { /* … */ }, createProject(input) { /* … */ },
  // …
};
```

The load-bearing seam is **`ManifestDiffer`**: core does the language-independent
file-level three-way diff; each generator plugs in its own manifest semantics
(`package.json` for JS, `pyproject.toml` for Python) — so npm concepts never leak
into core.

## Conformance — the executable definition of "Packkit"

A shared CI ensures every repo runs tests; the conformance suite defines *what they
must prove*. Every generator runs the same one:

```ts
import { runGeneratorConformanceSuite } from '@packkit/core/testing';
import { it } from 'vitest'; // or node:test

runGeneratorConformanceSuite(myGenerator, (name, fn) => it(name, fn));
```

It asserts: stable identity & protocol · unique preset/option ids · valid schema ·
every preset generates **safe, deterministic** output · valid deployment contracts ·
project-definition round-trip · capability/implementation consistency. Passing it —
not merely satisfying the TypeScript interface — is what makes a generator part of
the platform.

## Requirements

Node.js >= 20 (the browser entry runs anywhere).

## License

MIT © DanMat
