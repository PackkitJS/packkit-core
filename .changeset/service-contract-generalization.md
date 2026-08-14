---
'@packkit/core': minor
---

Generalize the service deployment contract to be language-neutral. The
`NodeServiceDeploymentContract` (`type: 'node-service'`, `runtime: 'node'`) becomes
`ServiceDeploymentContract` (`type: 'service'`, `runtime: string`) — mirroring the
already-neutral `WorkerDeploymentContract`. A provider now decides service support from
the contract shape, never from the language, so a Node, Python, or Go HTTP service all
emit the same `service` contract (with `runtime` `'node'` / `'python-3.12'` / `'go-1.23'`).

**Breaking** (deliberate; the last npm concept in core): `DeploymentType` drops
`'node-service'` for `'service'`; `DEPLOYABLE_TYPES`, `FullstackDeploymentContract.backend`,
`validateDeploymentContract`, and the exported type name change accordingly. Consumers
emitting or matching `'node-service'` must switch to `'service'`.
