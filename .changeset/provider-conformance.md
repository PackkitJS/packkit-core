---
'@packkit/core': minor
---

Add `runProviderConformanceSuite` (in `@packkit/core/testing`) and the `PackkitProvider`
contract — the executable definition of a well-behaved deployment provider, mirroring the
generator suite. It checks a stable id, deterministic `supports()` with reason codes, a
deterministic + JSON-serializable + schema-versioned `plan`, no leaked secrets, and that
`apply` is present iff the `apply` capability is advertised (so an IaC-emitting provider
like `provider-aws` can conform without a runtime apply). Providers supply a small harness
(supported/unsupported contract + plan input) since they don't share one plan-input shape.
