# hostfunc for VS Code

Build, deploy, and run [hostfunc](https://hostfunc.io) functions without leaving your editor.

> **Status: M2** — sign-in, function browsing with detail views, deploy, run-with-payload, and
> local file sync with push-on-save. Marketplace and MCP wiring land in later milestones.

---

## Features

- **Browser sign-in** via the OAuth device flow (RFC 8628). No token to copy — click **Sign in**,
  approve in the browser, done. Your access token is stored in VS Code **SecretStorage**, scoped per
  workspace/organization.
- **Functions explorer** — browse the functions in your active workspace with deploy/run status.
- **Function detail views** — expand a function to inspect its **triggers**, **recent versions**,
  **recent executions** (with copyable execution ids), and **secret key names** (values are never
  shown or transferred).
- **Deploy** the current draft to a live version, with progress + a copyable run URL.
- **Run with payload** — invoke a function with a JSON payload; the result and execution logs stream
  into the **hostfunc** Output channel.
- **Local file sync** — pull a function's draft into a folder and push edits back; saving the
  project's entry file pushes the draft automatically.
- **Switch workspace** — multiple organizations are supported; switch from the status bar. Each org
  gets its own token, minted on demand.

## Getting started (as a user)

1. Open the **hostfunc** view in the Activity Bar.
2. Click **Sign in to hostfunc** — a code appears and your browser opens to authorize the device.
3. Approve, and your functions appear in the Functions view.

See the in-app docs at `/docs/vscode-extension` for the full user guide.

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `hostfunc.baseUrl` | `https://hostfunc.io` | Control-plane URL. Point at `http://localhost:3000` for local dev, or your self-hosted instance. |

---

## How it works (architecture)

The extension is a thin, native VS Code client over the hostfunc control plane. It shares its API
contract with the `hostfunc` CLI via the private **`@hostfunc/api-client`** workspace package — one
typed `fetch` client, one device-flow implementation, used by both.

```
apps/vscode-extension/src
├── extension.ts            activate(): wires AuthManager, tree, commands, status bar, context key
├── auth.ts                 AuthManager — SecretStorage tokens, active org, device-flow sign-in
├── commands.ts             command handlers (signIn/out, switchOrg, deploy, run, …)
├── logs.ts                 RunLogChannel — renders run results + logs into an Output channel
├── views/functions-tree.ts FunctionsTreeProvider — the Functions explorer
└── lib/payload.ts          pure JSON-payload parsing/validation (unit-tested)
```

Shared logic lives in `packages/api-client/src`:

- `client.ts` — `HostfuncApiClient` (typed methods for every `/api/cli/*` route + device exchange).
- `device-flow.ts` — `requestDeviceCode` / `pollForToken` (RFC 8628), `clientId`-parameterized so
  the extension (`hostfunc-vscode`) and CLI (`hostfunc-cli`) reuse it.

### Authentication flow

1. `requestDeviceCode` → control plane returns a `user_code` + verification URL (better-auth
   `device-authorization` plugin, mounted at `/api/auth/device/*`).
2. The browser opens to `/device`, where the signed-in user approves the code.
3. `pollForToken` polls `/api/auth/device/token` until approval, yielding a session access token.
4. `POST /api/cli/device/exchange` (Bearer = session token, via better-auth `bearer` plugin) mints an
   org-scoped `hfn_live_` personal access token.
5. The PAT is stored in SecretStorage under `hostfunc.token.<orgId>`; the active org is stored in
   globalState. All subsequent `/api/cli/*` calls use the PAT.

Switching orgs mints a per-org PAT via `POST /api/cli/orgs` (authenticated with the current PAT), so
no long-lived session is retained client-side.

### Bundling

esbuild bundles `src/extension.ts` (+ `@hostfunc/api-client`) into a single CommonJS
`dist/extension.js`. `vscode` is marked external (provided by the host); `@hostfunc/api-client` is
bundled in. The extension is a **leaf** in the Turbo graph — it is never a build dependency of the
web app.

---

## Local development & testing

Prerequisites: the monorepo installed (`pnpm install`) and `@hostfunc/api-client` built
(`pnpm --filter @hostfunc/api-client build`, or just `pnpm build`).

```bash
# Bundle once / watch
pnpm --filter hostfunc-vscode build
pnpm --filter hostfunc-vscode dev        # esbuild --watch

# Gates
pnpm --filter hostfunc-vscode typecheck
pnpm --filter hostfunc-vscode test       # Vitest unit tests (pure logic)
```

### Run it in the Extension Development Host

1. Start a local control plane: `pnpm dev:web` (Next.js on `http://localhost:3000`). Make sure the
   DB is migrated (`pnpm db:migrate`) so the `device_code` table exists.
2. Open the repo in VS Code and press <kbd>F5</kbd> (launches an **Extension Development Host**
   window with the extension loaded). If prompted, pick the "Run Extension" launch config; if no
   config exists, see `.vscode/launch.json` below.
3. In the dev-host window, set `hostfunc.baseUrl` to `http://localhost:3000`
   (Settings → search "hostfunc").
4. Open the hostfunc view → **Sign in** → approve in the browser → your functions load.
5. Try **Deploy** and **Run with payload** on a function; watch the **hostfunc** Output channel.

A minimal `.vscode/launch.json` for the host:

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run hostfunc Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}/apps/vscode-extension"],
      "outFiles": ["${workspaceFolder}/apps/vscode-extension/dist/**/*.js"],
      "preLaunchTask": "npm: build - apps/vscode-extension"
    }
  ]
}
```

### Install the built `.vsix` locally

```bash
pnpm --filter hostfunc-vscode build
pnpm --filter hostfunc-vscode package    # → apps/vscode-extension/hostfunc.vsix
code --install-extension apps/vscode-extension/hostfunc.vsix
```

---

## Releasing to production

See **[PUBLISHING.md](./PUBLISHING.md)** for the full runbook: publisher setup, marketplace tokens,
versioning, and the tag-triggered CI workflow that publishes to the VS Marketplace and Open VSX.
