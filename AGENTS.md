# AGENTS.md

Guidance for AI coding agents working in **@packkit/core**.

## Stack

- Language: TypeScript (strict)
- Module format: ESM
- Package manager: npm
- Bundler: tsup
- Tests: vitest
- Lint/format: eslint-prettier

## Commands

- Type-check: `npm run typecheck`
- Lint: `npm run lint`
- Test: `npm test`
- Build: `npm run build`

## Conventions

- Source lives in `src/`. Keep the public API in `src/index.ts`.
- Add or update tests for any behavior change.
- Prefer explicit types on exported functions; keep `strict` passing.
- Run `npx changeset` after a user-facing change.
- Do not commit `dist/` or `node_modules/`.
