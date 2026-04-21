<div align="center">

<br />

```text
██╗  ██╗ ██████╗ ███████╗████████╗███████╗██╗   ██╗███╗   ██╗ ██████╗
██║  ██║██╔═══██╗██╔════╝╚══██╔══╝██╔════╝██║   ██║████╗  ██║██╔════╝
███████║██║   ██║███████╗   ██║   █████╗  ██║   ██║██╔██╗ ██║██║     
██╔══██║██║   ██║╚════██║   ██║   ██╔══╝  ██║   ██║██║╚██╗██║██║     
██║  ██║╚██████╔╝███████║   ██║   ██║     ╚██████╔╝██║ ╚████║╚██████╗
╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝
```

<br />

**The open-source platform for tiny, composable TypeScript functions.**

Write a function. Deploy in seconds. Trigger via HTTP, cron, email, or AI agents.  
Self-host on your own cloud or use the managed version.

[![License: AGPL-3.0-only](https://img.shields.io/badge/License-AGPL--3.0--only-blue.svg)](./LICENSE)
[![Status: Pre-Alpha](https://img.shields.io/badge/Status-Pre--Alpha-orange.svg)](#)
[![Node ≥22](https://img.shields.io/badge/Node-%E2%89%A522.0.0-brightgreen.svg)](https://nodejs.org)
[![pnpm ≥9](https://img.shields.io/badge/pnpm-%E2%89%A59.0.0-F69220.svg)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-ef4444.svg)](https://turbo.build)

</div>

<hr />

## 🌟 What is hostfunc?

**hostfunc** is a developer-first, radically simple serverless platform purpose-built for small, composable TypeScript functions. 

Instead of wrestling with cloud provider consoles, complex IAM roles, and sprawling deployment pipelines, you write a single exported `main()` function. **hostfunc handles everything else**—from bundling, high-speed deployment, and secret injection, to scheduling and deep observability.

```typescript
import fn, { secret } from "@hostfunc/sdk";

export async function main(input: { orderId: string }) {
  // 🔒 Securely pull secrets at runtime
  const apiKey = await secret.getRequired("STRIPE_SECRET_KEY");
  
  // 🔄 Easily compose and call other functions directly
  const charge = await fn.executeFunction("payments/create-charge", {
    orderId: input.orderId,
    apiKey,
  });

  return { ok: true, charge };
}
```

🔥 **Zero config files. Zero Docker images. Zero infrastructure YAML.**

---

## ✨ Key Features

We've designed **hostfunc** to give you exactly what you need to build powerful, distributed microservices at lightspeed.

| Feature | Description |
| :--- | :--- |
| ⚡️ **Instant Deployments** | Push TypeScript files and watch them go globally live in milliseconds. |
| 🪝 **Multiple Triggers** | Execute your code via HTTP endpoints, recurring `cron` schedules, inbound emails, and AI (MCP) tool bindings. |
| 🔐 **Encrypted Secret Vault** | Envelope-encrypted environment variables injected safely at runtime — never exposed in your logs or storage. |
| 🧩 **Composable Invocation** | Functions can easily call other functions via the type-safe `fn.executeFunction()` API with full loop detection built-in. |
| 🔬 **Deep Observability** | Native per-execution metrics: wall time, CPU time, memory peak, egress bytes, and structured log streaming. |
| 🚂 **Multi-Backend Runtime** | Pluggable underlying execution backends. Currently supporting **Cloudflare Workers**, with AWS Lambda, Fly, and Deno Deploy coming soon. |
| 🏢 **Team Workspace** | Native Organization-level access control with configurable *Owner*, *Admin*, and *Member* RBAC roles. |
| 💳 **Billing Ready** | Stripe-integrated billing logic with precise usage-based cost tracking via standard `costUnits`. |

---

## 🏗️ Architecture

**hostfunc** is structured as a modern **pnpm monorepo** built with [Turborepo](https://turbo.build). The codebase is elegantly segmented into **apps** (instantiable services) and **packages** (reusable libraries).

### 📁 Monorepo Structure

```text
hostfunc/
├── apps/
│   ├── web/                  # Next.js 16 Dashboard & Public Landing Page
│   ├── runtime/              # Dispatch worker routing /run/:owner/:slug
│   ├── outbound/             # Egress-control & networking worker
│   └── tail/                 # Tail worker forwarding logs & metrics to ingest
│
└── packages/
    ├── db/                   # Drizzle ORM schema, migrations, & Postgres client
    ├── executor-core/        # Backend-agnostic generic executor interface & types
    ├── executor-cloudflare/  # Cloudflare Workers execution backend implementation
    └── runtime-sdk/          # The intuitive @hostfunc/sdk in-function SDK
```

### 🌊 Data Flow

```mermaid
graph TD
    UserCode[User Code 'fn' importing @hostfunc/sdk] --> EdgeTrigger
    EdgeTrigger((Edge Trigger: HTTP/Cron/Email/MCP)) --> Router
    Router(Runtime Edge Router)
    Router -- "Validates schema, secrets & enforces resource limits" --> Backend
    Backend[ExecutorBackend e.g., CloudflareExecutor]
    Backend -- "deploy() / execute() / logs()" --> DB[(PostgreSQL via @hostfunc/db)]
    DB <--> Dash[Next.js Dashboard apps/web]
    
    style UserCode fill:#2d333b,stroke:#a2aabc
    style EdgeTrigger fill:#3b82f6,color:#fff
    style Router fill:#f59e0b,color:#fff
    style Backend fill:#10b981,color:#fff
    style DB fill:#8b5cf6,color:#fff
```

### 📦 Package Deep Dive

#### `apps/web` — The Unified Dashboard
A full-stack, bleeding-edge Next.js 16 Application (App Router + RSC) serving both the **marketing site** and the **authenticated control plane**. 

*   **Auth**: [better-auth](https://better-auth.com) with native organization support.
*   **Design**: Tailwind CSS 4, Radix UI headless components, and buttery Framer Motion animations.
*   **Editor**: Integrated Monaco Editor (the heart of VS Code) for flawless browser-based coding.
*   **Data**: Type-safe Drizzle ORM queries via `@hostfunc/db`.
*   **Monetization**: Integrated Stripe connectivity.

**Key Dashboard Routes:**
*   `/dashboard` — Metrics overview, total function stats, CPU charts, and recent activity feed.
*   `/dashboard/new` — Visually draft and instantly deploy a new function.
*   `/dashboard/[fn]` — Individual function view loaded with strict execution histories.
*   `/dashboard/[fn]/settings/secrets` — AES-encrypted key vault.
*   `/docs` — First-party Documentation portal.
*   *Settings routes cover General Workspace configs, Team Members, Billing, and Integrations.*

#### `packages/db` — The Persistence Layer
Fully-typed Drizzle ORM definitions pointing to **PostgreSQL 16**.

| Core Table | Primary Purpose |
| :--- | :--- |
| `fn` | Tracks semantic function definitions (slugs, visibility, active versions). |
| `fn_version` | Immutable historical bundles (source code, SHA-256 hashes, remote handles). |
| `fn_draft` | Live, in-browser editor state persistence mapped right to the user. |
| `trigger` | Definitions binding to `http`, `cron`, `email`, or `mcp` events. |
| `execution` | Massive telemetry ledger standardizing execution statuses, resource metrics, & logs. |
| `secret` | Safely stores wrapped DEKs + ciphertext pointer relationships. |
| `billing` | Subscription plans, limits, and real-time Stripe states. |

#### `packages/executor-core` — The Standard Implementation Interface
To ensure multi-cloud capability, the architecture mandates an `ExecutorBackend` standard:

```typescript
interface ExecutorBackend {
  deploy(input: DeployInput): Promise<DeployResult>;
  execute(input: ExecuteInput): Promise<ExecuteResult>;
  delete(functionId: string, versionId: string): Promise<void>;
  logs(executionId: string, opts?: any): AsyncIterable<LogLine>;
  health(): Promise<HealthStatus>;
}
```

#### `packages/executor-cloudflare` — The V8 Isolates Backend
We currently compile and provision user scripts securely into Cloudflare Workers out of the box, ensuring edge-native speeds, 0ms cold starts, and impenetrable isolation.

#### `packages/runtime-sdk` — Power at Your Fingertips
The official bridge from user code strictly routed to the host plane enforcing call-chains securely to eradicate loop bombs. Includes AI, Vector DB, and autonomous agent primitive exports. *(See the [SDK Readme](./packages/runtime-sdk/README.md))*

---

## 🤖 AI, Agent, and Vector Capabilities

Setting up intelligent agents or vector storage? Easily configure workspace default models natively. Follow integration priorities correctly:

1. Configure **Defaults**: Head to `/dashboard/settings/integrations`. Map out logic engines (OpenAI/Anthropic) and your Postgres/HTTP vector connectors seamlessly.
2. Provide **Credentials**: Add OpenAI/Claude keys + DB URLs.
3. Apply **Overrides (Optional)**: Drop function-level configurations safely inside `/dashboard/[fn]/settings`. 

Missing secrets gracefully fall back to clear, un-bricked `missing_secret` structured error logs for instant debugging.

---

## 🚀 Getting Started

### Prerequisites

| Tech | Version | Purpose |
| :--- | :--- | :--- |
| [Node.js](https://nodejs.org) | `>= 22.0.0` | Global JavaScript Runtime |
| [pnpm](https://pnpm.io) | `>= 9.0.0` | Hyper-fast monorepo package manager |
| [Docker](https://docker.com) | `Recent` | Provisioning PostgreSQL and Redis quickly |

### CLI Quickstart (Use it remotely!)

Interact comfortably with your online Workspace using the `npm` CLI utility. Zero telemetry included. 

```bash
# 1. Install globally
npm install -g @hostfunc/cli

# 2. Authenticate
hostfunc login --token <api-token> --url http://localhost:3000

# 3. Code, Deploy, Execute!
hostfunc init --fnId <fn_id>
hostfunc deploy
hostfunc run --payload ./payload.json
```

---

## 🛠️ Local Development & Ops

### The "One-Command" Setup

Spinning up the entire Hostfunc cloud plane on your local machine is effortless. Pull down the repo and run:

```bash
pnpm setup
```
This single script strictly runs dependencies, boots up Postgres (Docker), builds all packages flawlessly, and executes the ORM Migrations step-by-step.

*(To manually build, run `pnpm install`, `pnpm infra:up`, `pnpm build`, `pnpm db:migrate`, and lastly `pnpm dev`)*

### Environment Configurations

Safely duplicate required configs:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/runtime/.dev.vars.example apps/runtime/.dev.vars
```

**Crucial Variables Overview:**

| Env Variable | Functionality / Setup Tips |
| :--- | :--- |
| `DATABASE_URL` | Connect string. Local uses `postgres://hostfunc:hostfunc@localhost:5433/hostfunc-db` |
| `BETTER_AUTH_SECRET` | Mandatory randomized key for active session hashing |
| `EXEC_TOKEN_SECRET` | Required Base64 HMAC Key protecting function payloads and secrets |
| `RUNTIME_LOOKUP_TOKEN` | Secures the back-channel between Runtime worker vs Next.JS control plane |
| `STRIPE_SECRET_KEY` | Controls enterprise Stripe checkout sessions & cost mapping |

#### Stripe Webhooks & Cloudflare Tunnels (Advanced)

*   **OAuth:** Use `cloudflared tunnel --url http://localhost:3000`. Assign the generated HTTPS link to `BETTER_AUTH_URL`.
*   **Stripe Webhooks:** Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. Embed the `whsec_XXX` key directly into your `.env.local` as `STRIPE_WEBHOOK_SECRET`.
*   **Logs Simulation Pipeline:** Stream dummy telemetry data locally: 
    ```bash
    curl -sS -X POST http://localhost:3000/api/internal/logs/health \
      -H "authorization: Bearer $RUNTIME_LOOKUP_TOKEN" \
      -H "content-type: application/json" \
      -d '{"executionId":"exe_xxx","message":"health check"}'
    ```

> ⚠️ **Note:** Runtime API URLs adhere perfectly to `/run/{orgSlug}/{slug}`. Submitting calls over deprecated owner-based paths throws soft warning blocks! 

---

## 💻 Script Reference Engine

Execute strictly from the workspace **root**:

### Core Commands
*   `pnpm dev` — Boots all monorepo apps and packages sequentially via Turborepo dev servers.
*   `pnpm build` — Standardized production rollup across the stack.
*   `pnpm test` — Executes Vitest suites heavily globally.
*   `pnpm lint:fix` & `pnpm format` — Auto-repairs UI syntaxes using Biome JS.
*   `pnpm clean` — Nukes out stale `.turbo`, `node_modules`, and `dist` artifacts instantly.

### Postgres / Infra Matrix
*   `pnpm db:migrate` — Re-synchronizes Drizzle migrations against `.sql` builds securely.
*   `pnpm db:studio` — Initiates an attractive visual GUI over your Postgres tables at localhost! 
*   `pnpm infra:down` — Halts your Docker database. Data stays persistent!
*   `pnpm infra:reset` — Destroys container data explicitly and fresh-installs DB environments.

*(Refer to `docker-compose.yml` for port maps. DB runs explicitly on **5433** to escape traditional conflict headaches!)*

---

## 🔭 Tech Stack Topologies

Built on extremely stringent, highly-performant foundational tooling globally:

| Layer | Technology Implemented |
| :--- | :--- |
| **Framework Ecosystem** | [Next.js 16](https://nextjs.org) (App Router, Server Components) |
| **Type Integrity** | TypeScript 5.7 |
| **Execution Scaling** | [Turborepo](https://turbo.build) Caching & Task Pipelines |
| **RDBMS Schema** | [Drizzle ORM](https://orm.drizzle.team) -> PostgreSQL 16 |
| **Interface / Paint** | [Tailwind CSS 4](https://tailwindcss.com), [Radix UI](https://radix-ui.com), [Framer Motion](https://framer.motion.com) |
| **Edge Compute** | Cloudflare Workers Runtime V8 Isolates |

---

## 🤝 Contributing

We heavily appreciate and review every PR instantly!

Please browse through our [CONTRIBUTING.md](./CONTRIBUTING.md) meticulously for PR flows, branch definitions, and core styles. Project uses [Conventional Commits](https://www.conventionalcommits.org/) guarded actively by Husky lint rules.

## ⚖️ License

[AGPL-3.0-only](./LICENSE) — Hardcore Open Source driven, backed entirely by copyleft ethos.

---

> 🚨 **SYSTEM STATUS:** _PRE-ALPHA PHASE._ Core database primitives, remote interfaces, and structural definitions may dramatically evolve. Not strictly tailored for un-monitored production consumption yet. Ensure backup hygiene.

**Ops / Production Checklists**
* `ops/production-env-matrix.md`
* `ops/runbooks/stripe-live-cutover.md`
* `ops/observability.md`
* `ops/security-reliability-baseline.md`
* `ops/go-live-checklist.md`