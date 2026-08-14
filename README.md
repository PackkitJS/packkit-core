# @packkit/core 📦

> The versioned [Packkit](https://github.com/PackkitJS) platform contract — primitives, protocol, and an executable conformance suite. Language-agnostic; **browser-safe by default**.

[![npm](https://img.shields.io/npm/v/@packkit/core.svg)](https://www.npmjs.com/package/@packkit/core) [![CI](https://github.com/PackkitJS/packkit-core/actions/workflows/ci.yml/badge.svg)](https://github.com/PackkitJS/packkit-core/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

`packkit-core` owns the **universal Packkit protocol** and nothing language-specific.
It knows nothing about npm, `package.json`, `pyproject.toml`, frameworks, or provider
APIs. Language generators (`create-packkit`, `create-packkit-py`, …) implement its
contract; MCP, the web configurator, and providers consume it.

## Entry points

| Import                  | Contents                                                                                                                                                                                                                        | Environment                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `@packkit/core`         | Types, `PACKKIT_PROTOCOL_VERSION`, `contentHash`, `validateRelativePath`, `classifyChange`, deployment-contract types + `validateDeploymentContract`, `PackkitGenerator`/`ManifestDiffer` interfaces, `createGeneratorRegistry` | **browser-safe** — imports no `node:*` (asserted in CI) |
| `@packkit/core/node`    | `writeGeneratedProject` (filesystem)                                                                                                                                                                                            | Node                                                    |
| `@packkit/core/testing` | `runGeneratorConformanceSuite`, `runEmbeddedLifecycleConformance`, and their check lists                                                                                                                                        | dev/test                                                |

## The protocol

A generator advertises a **protocol version** (separate from this package's semver)
and the **capabilities** it actually implements, so consumers degrade gracefully:

```ts
import type { PackkitGenerator } from '@packkit/core';

const gen: PackkitGenerator = {
	id: 'python',
	language: 'python',
	version: '1.0.0',
	maturity: 'stable',
	protocol: {
		version: 1,
		capabilities: ['generate', 'deployment-contract', 'project-definition', 'baseline-upgrade'],
	},
	listPresets() {
		/* … */
	},
	getSchema() {
		/* … */
	},
	createProject(input) {
		/* … */
	},
	// …
};
```

The load-bearing seam is **`ManifestDiffer`**: core does the language-independent
file-level three-way diff; each generator plugs in its own manifest semantics
(`package.json` for JS, `pyproject.toml` for Python) — so npm concepts never leak
into core.

## Lifecycle primitives — drive any generator the same way

Core owns the language-neutral lifecycle so a host integrates once and supports every
generator. All of these operate on the protocol shapes, never a manifest:

- `calculateGeneratedProjectDigest(project)` — a stable, browser-safe identity digest
  (config + files); the same project yields the same digest across CLI, embedded,
  MCP, web, and a replayed definition.
- `extendGeneratedProject(project, { files })` — layer host-owned files with explicit
  `add`/`replace` intent, collision detection, path safety, and provenance that
  survives definition export → replay. Structured manifest merges (package.json,
  pyproject.toml) stay inside each generator.
- `computeProjectUpgrade` + the common `UpgradeResult` envelope — one file-level
  upgrade vocabulary (`unchanged` / `new-generated` / `removed-from-template` /
  `template-only-change` / `user-only-change` / `both-changed`); a generator attaches
  its structured manifest diff via `plan.manifest`.

## Three ways to integrate

- **Universal platform** — this package + `PackkitGenerator` + a generator registry.
  Select by generator id and drive JS, Python, and future generators through one
  lifecycle. For portals, agent hosts, and multi-language tooling.
- **Language-specific** — a generator's own embedded API (`create-packkit/embedded`,
  the Python equivalent) when you deliberately want its richer, language-aware
  features. Still fully compatible with the universal contract.
- **Filesystem** — the Node-safe writer at `@packkit/core/node`. Generation and
  upgrade planning stay side-effect free; writing is an explicit, separate step.

## Conformance — the executable definition of "Packkit"

A shared CI ensures every repo runs tests; the conformance suites define _what they
must prove_. Every generator runs both:

```ts
import {
	runGeneratorConformanceSuite,
	runEmbeddedLifecycleConformance,
} from '@packkit/core/testing';
import { it } from 'vitest'; // or node:test

runGeneratorConformanceSuite(myGenerator, (name, fn) => it(name, fn));
runEmbeddedLifecycleConformance(myGenerator, (name, fn) => it(name, fn));
```

**Generation** asserts: stable identity & protocol · unique preset/option ids · valid
schema · safe, deterministic output · valid deployment contracts · definition
round-trip. **Lifecycle** asserts: digest stability · replay determinism · host-extension
survival · the common upgrade envelope with user-edit preservation — gated on advertised
capabilities. Passing them — not merely satisfying the TypeScript interface — is what
makes a generator part of the platform. Both JavaScript and Python pass today.

## Requirements

Node.js >= 20 (the browser entry runs anywhere).

## License

MIT © DanMat
