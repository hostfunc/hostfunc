<div align="center">

<br />

```
██╗  ██╗ ██████╗ ███████╗████████╗███████╗██╗   ██╗███╗   ██╗ ██████╗
██║  ██║██╔═══██╗██╔════╝╚══██╔══╝██╔════╝██║   ██║████╗  ██║██╔════╝
███████║██║   ██║███████╗   ██║   █████╗  ██║   ██║██╔██╗ ██║██║     
██╔══██║██║   ██║╚════██║   ██║   ██╔══╝  ██║   ██║██║╚██╗██║██║     
██║  ██║╚██████╔╝███████║   ██║   ██║     ╚██████╔╝██║ ╚████║╚██████╗
╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝
```

**The open-source platform for tiny, composable TypeScript functions.**

Write a function. Deploy in seconds. Trigger via HTTP, cron, email, or AI agents.  
Self-host on your own cloud or use the managed version.

[![License: AGPL-3.0-only](https://img.shields.io/badge/License-AGPL--3.0--only-blue.svg)](./LICENSE)
[![Status: Pre-Alpha](https://img.shields.io/badge/Status-Pre--Alpha-orange.svg)](#)
[![Node ≥22](https://img.shields.io/badge/Node-%E2%89%A522.0.0-brightgreen.svg)](https://nodejs.org)
[![pnpm ≥9](https://img.shields.io/badge/pnpm-%E2%89%A59.0.0-F69220.svg)](https://pnpm.io)

</div>

---

## What is hostfunc?

hostfunc is a developer-first serverless platform purpose-built for small, composable TypeScript functions. Instead of wrestling with cloud provider consoles, IAM roles, and deployment pipelines, you write a single exported `main()` function and hostfunc handles everything else—bundling, deployment, secret injection, scheduling, and observability.

```typescript
import fn, { secret } from "@hostfunc/fn";
import Stripe from "stripe";

export async function main(req: Request) {
  const payload = await req.json();
  const apiKey = secret("STRIPE_SECRET_KEY");

  if (payload.type === "payment.succeeded") {
    console.log("Processing payment:", payload.data.object.id);
  }

  return { received: true };
}
```

That's it. No config files, no Docker images, no infrastructure YAML.

---

## Key Features

| Feature | Description |
|---|---|
| **Instant Deployments** | Push TypeScript files and they are globally live in milliseconds |
| **Multiple Trigger Types** | HTTP endpoints, cron schedules, inbound email, and AI (MCP) tool bindings |
| **Encrypted Secrets Vault** | Envelope-encrypted env vars injected at runtime — never exposed in logs or storage |
| **Composable Function Calls** | Functions can call other functions via the `fn.executeFunction()` API with loop detection |
| **Deep Observability** | Per-execution metrics: wall time, CPU time, memory peak, egress bytes, and structured logs |
| **Multi-Backend Executor** | Pluggable backends — currently Cloudflare Workers, with Lambda, Fly, and Deno Deploy planned |
| **Team Workspace** | Organization-level access control with Owner, Admin, and Member roles |
| **Billing Ready** | Stripe-integrated billing with usage-based cost tracking via `costUnits` |

---

## Architecture

hostfunc is a **pnpm monorepo** built with [Turborepo](https://turbo.build). The repository is split into **apps** (runnable services) and **packages** (shared libraries).

```
hostfunc/
├── apps/
│   ├── web/                  # Next.js 16 dashboard + public landing page
│   ├── runtime/              # Dispatch worker that routes /run/:owner/:slug
│   ├── outbound/             # Egress-control worker
│   └── tail/                 # Tail worker that forwards logs/metrics to ingest
│
└── packages/
    ├── db/                   # Drizzle ORM schema, migrations, and Postgres client
    ├── executor-core/        # Backend-agnostic executor interface & types
    ├── executor-cloudflare/  # Cloudflare Workers execution backend
    └── runtime-sdk/          # The @hostfunc/fn in-function API shim
```

### Data Flow

```
User Code (fn)
     │  imports @hostfunc/fn (runtime-sdk shim)
     ▼
Edge Trigger  ──────────────────────────────────────────┐
  (HTTP / Cron / Email / MCP)                           │
     │                                                  │
     ▼                                                  │
Runtime Edge Router  ◄── x-hostfunc-* headers ──────────┘
     │  validates input schema, resolves secrets,
     │  enforces resource limits (wallMs, cpuMs, memMb, egress)
     ▼
ExecutorBackend (e.g. CloudflareExecutor)
     │  deploy() — bundle & provision
     │  execute() — run one invocation
     │  logs()   — stream structured log lines
     ▼
PostgreSQL (via @hostfunc/db)
     │  Stores: fns, fn_versions, fn_drafts, executions, triggers,
     │           secrets (encrypted refs), tokens, billing, auth
     ▼
Next.js Dashboard (apps/web)
     │  Dashboard overview, function editor (Monaco),
     │  execution history, secrets vault, team management
```

### Package Details

#### `apps/web` — The Dashboard

The full-stack Next.js application. It serves both the **public marketing page** and the **authenticated dashboard**. It uses:

- **Authentication**: [better-auth](https://better-auth.com) with organization support
- **UI**: Tailwind CSS 4, Radix UI primitives, Framer Motion animations
- **Editor**: Monaco Editor (VS Code's engine) for in-browser function editing
- **DB Access**: Drizzle ORM via `@hostfunc/db`
- **Payments**: Stripe for billing

Dashboard pages include:
- `/dashboard` — Overview with metrics (total functions, executions, failures, CPU time) and recent activity feed
- `/dashboard/new` — Create and deploy a new function
- `/dashboard/[fn]` — Per-function detail view with execution history
- `/dashboard/[fn]/settings/secrets` — Encrypted secrets vault (add, view, delete)
- `/dashboard/settings` — General workspace settings (name, slug)
- `/dashboard/settings/members` — Team management (invite, role changes, pending invitations)
- `/dashboard/settings/billing` — Usage and billing management
- `/dashboard/settings/integrations` — Cloud integrations
- `/docs` — Documentation portal

#### `packages/db` — Database Layer

Drizzle ORM schema and migrations targeting **PostgreSQL 16**. Schema tables:

| Table | Purpose |
|---|---|
| `fn` | Function definitions (slug, visibility, currentVersionId) |
| `fn_version` | Immutable versioned bundles (code, sha256, backend handle) |
| `fn_draft` | Per-user unsaved editor state |
| `trigger` | Trigger configs: `http`, `cron`, `email`, `mcp` |
| `execution` | Execution records with status, metrics, and trigger kind |
| `secret` | Encrypted secret references (wrapped DEK + ciphertext pointer) |
| `token` | API tokens scoped to an org or function |
| `organization` / `member` | Workspace and membership (via better-auth) |
| `billing` | Plan, usage, and Stripe subscription state |

#### `packages/executor-core` — The Executor Contract

Defines the `ExecutorBackend` interface that all execution backends must implement:

```typescript
interface ExecutorBackend {
  deploy(input: DeployInput): Promise<DeployResult>;
  execute(input: ExecuteInput): Promise<ExecuteResult>;
  delete(functionId, versionId): Promise<void>;
  logs(executionId, opts?): AsyncIterable<LogLine>;
  health(): Promise<HealthStatus>;
}
```

Also defines all shared types: `TriggerContext` (http, cron, email, mcp, fn\_call), `ResourceLimits`, `ExecutionMetrics`, `ErrorCode`, and `LogLine`.

#### `packages/executor-cloudflare` — Cloudflare Workers Backend

Concrete implementation of `ExecutorBackend` targeting Cloudflare Workers. Handles bundling and deploying user code as isolated Worker scripts, and proxying execution requests.

#### `packages/runtime-sdk` — The In-Function SDK

The virtual `@hostfunc/fn` module users import inside their functions:

```typescript
import fn, { secret } from "@hostfunc/fn";

// Call another function
const result = await fn.executeFunction("my-other-fn", { input: 42 });

// Access an encrypted secret
const key = await secret.getRequired("MY_API_KEY");
```

The shim communicates with the control plane via internal headers (`x-hostfunc-exec-id`, `x-hostfunc-call-chain`, etc.) and enforces call-depth limits to prevent infinite loops.

---

## Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| [Node.js](https://nodejs.org) | ≥ 22.0.0 |
| [pnpm](https://pnpm.io) | ≥ 9.0.0 |
| [Docker](https://docker.com) | Any recent version |

### CLI Quickstart

Install the CLI (public npm package):

```bash
npm install -g @hostfunc/cli
```

Authenticate and deploy your first function:

```bash
hostfunc login --token <api-token> --url http://localhost:3000
hostfunc init --fnId <fn_id>
hostfunc deploy
hostfunc run --payload ./payload.json
```

Supported CLI runtime:
- Node.js `>=22`
- No telemetry is collected by the CLI

### One-Command Setup

```bash
pnpm setup
```

This single command will:
1. Install all dependencies across the monorepo
2. Start the local Postgres database (via Docker)
3. Build all packages
4. Run database migrations

### Manual Setup

```bash
# 1. Install all dependencies
pnpm install

# 2. Start the local Postgres instance
pnpm infra:up

# 3. Build all packages (db must be built before web)
pnpm build

# 4. Run database migrations
pnpm db:migrate

# 5. (Optional) Seed the database with sample data
pnpm db:seed

# 6. Start the development server
pnpm dev
```

### Environment Variables

Copy the example env file in `apps/web`:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Key variables to configure:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (default: `postgres://hostfunc:hostfunc@localhost:5433/hostfunc-db`) |
| `REDIS_URL` | Execution registry store (default: `redis://127.0.0.1:6379`) |
| `BETTER_AUTH_SECRET` | Random secret for session signing |
| `NEXT_PUBLIC_APP_URL` | Public URL of the web app |
| `EXEC_TOKEN_SECRET` | Base64 32-byte HMAC key for runtime callback tokens |
| `RUNTIME_LOOKUP_TOKEN` | Shared internal auth token for runtime ↔ web endpoints |
| `STRIPE_SECRET_KEY` | Stripe secret key (for billing features) |

---

## Scripts Reference

All scripts are run from the **repository root** with `pnpm <script>`.

### Development

| Script | Description |
|---|---|
| `pnpm dev` | Start all packages in watch/dev mode (Turbo) |
| `pnpm dev:web` | Start only the Next.js web app |
| `pnpm build` | Production build for all packages |
| `pnpm test` | Run tests across all packages |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | Run TypeScript type checking across the monorepo |

### Code Quality

| Script | Description |
|---|---|
| `pnpm lint` | Check code with Biome |
| `pnpm lint:fix` | Auto-fix Biome lint errors |
| `pnpm format` | Format all files with Biome |

### Database

| Script | Description |
|---|---|
| `pnpm db:generate` | Generate new migration files from schema changes |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:push` | Push schema changes directly (dev use only) |
| `pnpm db:seed` | Seed the database with sample data |
| `pnpm db:studio` | Open Drizzle Studio (database browser UI) |

### Infrastructure

| Script | Description |
|---|---|
| `pnpm infra:up` | Start the local Postgres container |
| `pnpm infra:down` | Stop the local Postgres container |
| `pnpm infra:reset` | Wipe and restart Postgres (destroys all local data) |
| `pnpm setup` | Full first-time setup (install → infra → build → migrate) |

### Release

| Script | Description |
|---|---|
| `pnpm changeset` | Create a new changeset entry |
| `pnpm version` | Bump versions based on changesets |
| `pnpm release` | Build and publish packages |
| `pnpm clean` | Remove all build artifacts and `node_modules` |

---

## Docker

The `docker-compose.yml` provides local Postgres + Redis:

- **Host port**: `5433` (to avoid conflicts with any system-level Postgres on 5432)
- **Database**: `hostfunc-db`
- **User / Password**: `hostfunc` / `hostfunc`
- **Postgres persistence**: `hostfunc-postgres`
- **Redis persistence**: `hostfunc-redis`

```bash
# Start
pnpm infra:up

# Stop (preserves data)
pnpm infra:down

# Reset (wipes all data)
pnpm infra:reset
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, RSC) |
| **Language** | TypeScript 5.7 |
| **Monorepo** | [Turborepo](https://turbo.build) + [pnpm workspaces](https://pnpm.io/workspaces) |
| **Database** | PostgreSQL 16 via [Drizzle ORM](https://orm.drizzle.team) |
| **Auth** | [better-auth](https://better-auth.com) |
| **UI** | [Tailwind CSS 4](https://tailwindcss.com) + [Radix UI](https://radix-ui.com) |
| **Animations** | [Framer Motion](https://framer.motion.com) |
| **Code Editor** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |
| **Payments** | [Stripe](https://stripe.com) |
| **Linting** | [Biome](https://biomejs.dev) |
| **Execution** | Cloudflare Workers (primary backend) |
| **IDs** | [ULID](https://github.com/ulid/spec) throughout |

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on commit messages, branch naming, and the pull request process. We follow [Conventional Commits](https://www.conventionalcommits.org/) enforced via commitlint + Husky.

---

## License

[AGPL-3.0-only](./LICENSE) — open source with copyleft requirements.

---

> **Status:** pre-alpha. Interfaces and schema may change without notice. Not recommended for production use yet.