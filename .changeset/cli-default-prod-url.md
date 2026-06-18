---
"@hostfunc/cli": patch
---

Default `hostfunc init` and `hostfunc login` to the production API (`https://app.hostfunc.io`) when no `--url` is given, instead of `http://localhost:3000`. Local development can still target a local control plane with `--url http://localhost:3000`.
