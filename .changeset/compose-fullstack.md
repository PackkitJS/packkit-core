---
'@packkit/core': minor
---

Add `composeFullstack({ frontend, backend, options })` — a language-neutral primitive
that composes two independently-generated projects (a `static` frontend and a `service`
backend) into one fullstack repo. It merges the trees under `apps/web/` + `apps/server/`,
rewrites the sub-contracts to be root-relative, emits a neutral root `docker-compose.yml`
(driven entirely by the contracts' ports/Dockerfiles/output dirs — no npm/uv/language
assumptions) and a README, and carries the `fullstack` deployment contract so a provider
deploys the pair from one definition. Core never learns "React" or "FastAPI", so
React+FastAPI, React+Go, or Vue+Node all compose identically. Surfaces (web, MCP) build on
this shared primitive.
