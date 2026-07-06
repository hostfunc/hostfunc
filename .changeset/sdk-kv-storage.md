---
"@hostfunc/sdk": minor
---

Add `@hostfunc/sdk/kv` — built-in key-value storage scoped to each function. `kv.get`, `kv.set` (with optional TTL), `kv.delete`, `kv.incr` (atomic), `kv.getMany`, and `kv.list` (prefix + cursor pagination). No new runtime dependencies; all calls go through the control plane like the vector module.
