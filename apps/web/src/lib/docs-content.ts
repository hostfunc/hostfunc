export interface DocsSection {
  title: string;
  links: Array<{ name: string; href: string }>;
}

export interface DocsPageContent {
  title: string;
  summary: string;
  highlights: string[];
  guideSections?: Array<{
    title: string;
    description: string;
    bullets?: string[];
    code?: string;
  }>;
  sdkGuide?: {
    quickstart?: string;
    apiReference: Array<{
      name: string;
      signature: string;
      description: string;
      args?: Array<{ name: string; type: string; required: boolean; description: string }>;
      returns?: string;
      throws?: string[];
      notes?: string[];
    }>;
    codeExamples?: Array<{
      title: string;
      description: string;
      code: string;
    }>;
    bestPractices?: string[];
  };
  related: Array<{ label: string; href: string }>;
}

export interface DocsSearchRecord {
  href: string;
  title: string;
  summary: string;
  sectionTitles: string[];
}

export const docsSections: DocsSection[] = [
  {
    title: "Start Here",
    links: [
      { name: "Introduction", href: "/docs" },
      { name: "Getting Started", href: "/docs/getting-started" },
    ],
  },
  {
    title: "Core Platform",
    links: [
      { name: "Functions", href: "/docs/functions" },
      { name: "Triggers", href: "/docs/triggers" },
      { name: "Executions", href: "/docs/executions" },
    ],
  },
  {
    title: "Access and Tooling",
    links: [
      { name: "Security", href: "/docs/security" },
      { name: "CLI", href: "/docs/cli" },
      { name: "MCP", href: "/docs/mcp" },
    ],
  },
  {
    title: "SDK",
    links: [
      { name: "@hostfunc/sdk", href: "/docs/sdk" },
      { name: "AI module", href: "/docs/sdk/ai" },
      { name: "Agent module", href: "/docs/sdk/agent" },
      { name: "Vector module", href: "/docs/sdk/vector" },
    ],
  },
];

export const docsPages: Record<string, DocsPageContent> = {
  "/docs": {
    title: "Hostfunc Docs",
    summary:
      "Hostfunc is a control plane for TypeScript functions: build in dashboard or CLI, deploy to Cloudflare runtime workers, and operate with execution logs, metrics, and token-based automation.",
    highlights: [
      "Function lifecycle: draft -> deploy -> immutable version -> runtime invocation.",
      "Trigger model: HTTP, cron, email, and MCP metadata per function.",
      "Operational surfaces: execution history, logs, statuses, and usage limits.",
      "Automation surfaces: API tokens, CLI routes, and `/api/mcp` JSON-RPC tools.",
    ],
    related: [
      { label: "Getting Started", href: "/docs/getting-started" },
      { label: "Functions", href: "/docs/functions" },
      { label: "CLI", href: "/docs/cli" },
    ],
  },
  "/docs/getting-started": {
    title: "Getting Started",
    summary:
      "Use dashboard or CLI to deploy your first function, then verify execution and logs through the same control plane.",
    highlights: [
      "HTTP runtime path is `/run/:orgSlug/:fnSlug`.",
      "`@hostfunc/sdk` is the current runtime SDK (`@hostfunc/fn` remains supported).",
      "Secrets are fetched at runtime with `secret.get`/`secret.getRequired`.",
      "Every invocation creates an execution record and log stream.",
    ],
    guideSections: [
      {
        title: "1. Create a function in dashboard",
        description:
          "Start in `/dashboard/new`, set slug/metadata, and write a small `main` function.",
        bullets: [
          "Draft changes are editable before deployment.",
          "Add required secrets in function settings before first production run.",
        ],
        code: `import fn, { secret } from "@hostfunc/sdk";

export async function main(input: { name?: string }) {
  const token = await secret.getRequired("INTERNAL_API_TOKEN");
  return { ok: true, greeting: \`hello \${input.name ?? "world"}\`, tokenLoaded: Boolean(token) };
}`,
      },
      {
        title: "2. Deploy and invoke",
        description:
          "Deploy creates an immutable version and updates the function pointer used by runtime dispatch.",
        bullets: [
          "Invoke over HTTP at `/run/:orgSlug/:fnSlug`.",
          "If HTTP trigger requires auth, pass a workspace API token.",
        ],
        code: `curl -X POST "https://run.hostfunc.io/run/acme/invoice-sync" \\
  -H "content-type: application/json" \\
  -d '{"invoiceId":"inv_123"}'`,
      },
      {
        title: "3. Set up CLI for repeatable deploys",
        description: "CLI maps directly to `/api/cli/*` routes and uses API token auth.",
        bullets: [
          "Credentials are stored under `~/.hostfunc` by default.",
          "Project defaults live in `hostfunc.json`.",
        ],
        code: `npm install -g @hostfunc/cli
hostfunc login --token <api-token> --url http://localhost:3000
hostfunc init --fnId <fn_id>
hostfunc deploy
hostfunc run --payload ./payload.json
hostfunc logs --executionId <execution_id>`,
      },
      {
        title: "4. Connect MCP clients when needed",
        description: "Use `/api/mcp` with bearer token auth for AI/editor tool access.",
        bullets: [
          "Methods implemented: `initialize`, `tools/list`, `tools/call`, `ping`.",
          "Tools implemented: `functions.*`, `executions.*`.",
        ],
        code: `{
  "mcpServers": {
    "hostfunc": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:3000/api/mcp",
        "--header",
        "Authorization: Bearer <api-token>"
      ]
    }
  }
}`,
      },
    ],
    related: [
      { label: "Functions", href: "/docs/functions" },
      { label: "Executions and Logs", href: "/docs/executions" },
      { label: "MCP", href: "/docs/mcp" },
    ],
  },
  "/docs/functions": {
    title: "Functions",
    summary:
      "Functions move through draft and deployed versions. Runtime dispatch resolves deployed version metadata and executes in Cloudflare workers.",
    highlights: [
      "Deploy creates immutable versions and stores runtime handles per version.",
      "SDK composition calls (`fn.executeFunction`) preserve execution lineage.",
      "Secret access is runtime-mediated, never hardcoded in function source.",
      "Call depth is enforced to prevent recursive loops.",
    ],
    sdkGuide: {
      quickstart:
        "Use `@hostfunc/sdk` as default import surface. Use `@hostfunc/fn` only for legacy compatibility.",
      apiReference: [
        {
          name: "fn.executeFunction",
          signature:
            "await fn.executeFunction(slug: string, input?: Record<string, unknown>): Promise<unknown>",
          description:
            "Invokes another function through runtime dispatch and records parent-child execution linkage.",
          args: [
            {
              name: "slug",
              type: "string (`orgSlug/fnSlug`)",
              required: true,
              description: "Target function identifier.",
            },
            {
              name: "input",
              type: "Record<string, unknown>",
              required: false,
              description: "JSON payload forwarded to downstream `main()` input.",
            },
          ],
          returns: "Parsed JSON returned by the downstream function.",
          throws: [
            "FN_NOT_FOUND if slug is malformed or function is unavailable.",
            "FN_CALL_DEPTH when call-depth protection triggers.",
            "FN_THREW for non-2xx downstream responses.",
          ],
          notes: [
            "Prefer stable slugs from config, not raw user input.",
            "Pass IDs/references instead of large blobs for better latency.",
          ],
        },
        {
          name: "secret.get",
          signature: "await secret.get(key: string): Promise<string | null>",
          description: "Fetches an optional secret configured for the current function.",
          args: [
            {
              name: "key",
              type: "string",
              required: true,
              description: "Secret key name configured in function settings.",
            },
          ],
          returns: "Secret value as string, or `null` when not set.",
          throws: ["INFRA_EXECUTE_FAILED when secret service cannot be reached/authenticated."],
        },
        {
          name: "secret.getRequired",
          signature: "await secret.getRequired(key: string): Promise<string>",
          description: "Fetches a required secret and throws if the key is missing.",
          args: [
            {
              name: "key",
              type: "string",
              required: true,
              description: "Secret key name configured in function settings.",
            },
          ],
          returns: "Secret value as string.",
          throws: [
            "MISSING_SECRET (wrapped in SDK error detail) when key is missing.",
            "INFRA_EXECUTE_FAILED when control-plane secret service fails.",
          ],
          notes: ["Use for credentials required on every invocation path."],
        },
      ],
      codeExamples: [
        {
          title: "Composition with required secret",
          description: "Default pattern for function-to-function workflows.",
          code: `import fn, { secret } from "@hostfunc/sdk";

export async function main(input: { customerId: string }) {
  const apiKey = await secret.getRequired("CLAUDE_API_KEY");

  const report = await fn.executeFunction("my-org/generate-report", {
    customerId: input.customerId,
    apiKey,
  });

  return await fn.executeFunction("my-org/post-to-slack", {
    report,
    channel: "#alerts",
  });
}`,
        },
      ],
      bestPractices: [
        "Keep functions small and composable.",
        "Treat missing required secrets as configuration failures.",
        "Design downstream calls to be idempotent for retries.",
        "Use explicit payload schemas to avoid shape drift.",
      ],
    },
    related: [
      { label: "Triggers", href: "/docs/triggers" },
      { label: "Executions", href: "/docs/executions" },
      { label: "Getting Started", href: "/docs/getting-started" },
    ],
  },
  "/docs/triggers": {
    title: "Triggers",
    summary:
      "Trigger config is persisted per function/kind and controls how runtime invocation is initiated.",
    highlights: [
      "Kinds: `http`, `cron`, `email`, `mcp`.",
      "Cron/email invokes runtime through authenticated internal paths.",
      "HTTP can be public or token-protected via `requireAuth`.",
      "MCP trigger metadata is stored and available for tooling.",
    ],
    guideSections: [
      {
        title: "Trigger schema",
        description: "Each function keeps at most one row per trigger kind (`fnId + kind`).",
        bullets: [
          "http: `{ requireAuth: boolean }` (defaults to false for new functions)",
          "cron: `{ schedule: string, timezone?: string }`",
          "email: `{ address: string, allowlist?: string[] }` — `address` is generated by the platform",
          "mcp: `{ toolName: string, description: string }`",
        ],
      },
      {
        title: "HTTP trigger",
        description: "HTTP entrypoint is runtime route `/run/:orgSlug/:fnSlug`.",
        bullets: [
          "HTTP is created automatically for new functions.",
          "When `requireAuth` is true, send `Authorization: Bearer <workspace API token>` (see Settings → Tokens).",
          "Nested calls from `executeFunction` send `x-hostfunc-parent-exec` and skip the API token when the parent execution is valid.",
        ],
      },
      {
        title: "Cron trigger",
        description:
          "Cron worker fetches due jobs from control plane and invokes runtime with cron trigger metadata.",
        bullets: [
          "Due/ack flow is handled by internal cron endpoints.",
          'Runtime receives `hostfuncTriggerKind: "cron"` over an authenticated internal invoke.',
        ],
      },
      {
        title: "Email trigger",
        description:
          "Inbound adapters POST to the control plane; matching triggers invoke the user worker with `email(data)` and the payload shape below.",
        bullets: [
          "Dashboard saves allocate `fn-*@<HOSTFUNC_MAIL_DOMAIN>`; optional allowlist restricts senders.",
          "User code exports `export async function email(data)`; `data.email` includes `to`, `from`, `rawSize`, `timestamp`, and optional `subject` / `body`.",
        ],
      },
      {
        title: "MCP-related triggering",
        description: "MCP tool calls execute through `/api/mcp` handlers and are audited.",
        bullets: [
          "MCP tools include function execution operations.",
          "MCP trigger config exists in trigger model for function-level metadata.",
        ],
      },
    ],
    related: [
      { label: "Executions", href: "/docs/executions" },
      { label: "MCP", href: "/docs/mcp" },
    ],
  },
  "/docs/executions": {
    title: "Executions and Logs",
    summary:
      "Every invocation writes an execution row plus logs and metrics. Use dashboard and CLI to investigate failures quickly.",
    highlights: [
      "Statuses include `ok`, `fn_error`, `limit_exceeded`, `infra_error`.",
      "Trigger kind and parent execution metadata are first-class fields.",
      "Logs are ingested and available via dashboard and `/api/cli/executions/logs`.",
    ],
    guideSections: [
      {
        title: "Execution status model",
        description: "Execution records store lifecycle status and runtime metrics.",
        bullets: [
          "Statuses: `ok`, `fn_error`, `infra_error`, `limit_exceeded`.",
          "Metrics include wall time, CPU time, memory peak, egress bytes, and subrequest count.",
          "Composition metadata includes `parentExecutionId` and `callDepth`.",
        ],
      },
      {
        title: "Filtering and list APIs",
        description:
          "Execution list APIs support filters by status, trigger kind, and optional date range/cursor windows.",
        bullets: [
          "Dashboard filtering currently exposes status + trigger chips.",
          "Backend APIs also accept `from`, `to`, and `cursor` for pagination windows.",
        ],
      },
      {
        title: "Logs and ingestion",
        description:
          "Runtime/tail ingestion writes structured logs and runtime metrics to control-plane storage.",
        bullets: [
          "Dashboard execution detail consumes live updates through server APIs.",
          "CLI logs route: `/api/cli/executions/logs` (latest or by execution id).",
          "Structured log fields are preserved with each log line.",
        ],
      },
      {
        title: "Practical debug workflow",
        description: "Use execution detail + logs together when investigating failures.",
        bullets: [
          "Check trigger kind and parent execution linkage first.",
          "Inspect `errorMessage` and log sequence around failure timestamps.",
          "Use filtered execution views to isolate regressions after deploy.",
        ],
      },
    ],
    related: [
      { label: "Triggers", href: "/docs/triggers" },
      { label: "CLI logs", href: "/docs/cli" },
    ],
  },
  "/docs/security": {
    title: "Security and Access",
    summary:
      "Security is split by boundary: dashboard session auth, API-token auth for automation, and internal bearer-token controls for runtime/control-plane traffic.",
    highlights: [
      "Dashboard actions require an active session and organization context.",
      "CLI/MCP automation uses bearer API tokens validated against hashed token records.",
      "Internal runtime/control routes use shared bearer env tokens and execution callback verification.",
      "MCP supports optional origin allowlisting and per-token rate limiting.",
    ],
    guideSections: [
      {
        title: "Dashboard session access",
        description:
          "User-facing app actions run under Better Auth sessions and active organization membership checks.",
        bullets: [
          "Server-side guards enforce session + org access before data operations.",
          "Middleware is an entry gate; core authorization is validated in server handlers/actions.",
        ],
      },
      {
        title: "API tokens for CLI and MCP",
        description:
          "API tokens are bearer credentials with org/user association and expiry support.",
        bullets: [
          "Token format is validated before auth lookup.",
          "Stored tokens are hashed (Argon2id) and compared securely.",
          "Successful auth updates token `lastUsedAt` for audit visibility.",
        ],
      },
      {
        title: "Internal runtime trust boundary",
        description:
          "Runtime callbacks and internal control routes are protected by internal bearer tokens and execution token checks.",
        bullets: [
          "Internal endpoints require configured shared env secrets.",
          "Execution callback tokens are HMAC-signed and validated with expiration and active execution checks.",
        ],
      },
      {
        title: "MCP controls",
        description:
          "MCP endpoint enforces bearer auth and request controls suitable for tool-call automation.",
        bullets: [
          "Origin allowlisting is enforced only when `MCP_ALLOWED_ORIGINS` is configured.",
          "Rate limit is enforced per token id.",
          "MCP tool calls are audited for request/response visibility.",
        ],
      },
    ],
    related: [
      { label: "CLI", href: "/docs/cli" },
      { label: "MCP", href: "/docs/mcp" },
    ],
  },
  "/docs/cli": {
    title: "CLI",
    summary:
      "Public npm package `@hostfunc/cli` supports login, init, list, deploy, run, logs, and secrets set flows.",
    highlights: [
      "CLI authenticates with API token and base URL config.",
      "Deploy/run/logs/secrets map to `/api/cli/*` routes.",
      "CLI reads project config from `hostfunc.json` and user credentials from `~/.hostfunc`.",
      "Supported runtime is Node.js >=22 and CLI telemetry is disabled.",
    ],
    guideSections: [
      {
        title: "Install and authenticate",
        description: "Install CLI globally, then log in once per environment.",
        code: `npm install -g @hostfunc/cli
hostfunc login --token <api-token> --url http://localhost:3000`,
      },
      {
        title: "Project configuration",
        description:
          "CLI uses `hostfunc.json` in your project and token credentials stored in your hostfunc credentials directory.",
        bullets: [
          "`hostfunc.json` stores base URL and optional default `fnId`.",
          "Credentials are stored in `~/.hostfunc/credentials.json` by default.",
          "Credential path can be overridden with `HOSTFUNC_CREDENTIALS_DIR` or `HOSTFUNC_CREDENTIALS_FILE`.",
        ],
      },
      {
        title: "Core commands",
        description: "These commands are implemented and supported in current CLI.",
        code: `hostfunc init --fnId <fn_id>
hostfunc list
hostfunc deploy
hostfunc run --payload ./payload.json
hostfunc logs --executionId <execution_id>
hostfunc secrets set CLAUDE_API_KEY <value>`,
      },
      {
        title: "Command to API mapping",
        description: "CLI operations map directly to org-scoped API routes.",
        bullets: [
          "`login` -> `GET /api/cli/login`",
          "`list` -> `GET /api/cli/functions`",
          "`deploy` -> `POST /api/cli/functions/deploy`",
          "`run` -> `POST /api/cli/functions/run`",
          "`logs` -> `GET /api/cli/executions/logs`",
          "`secrets set` -> `POST /api/cli/secrets`",
        ],
      },
    ],
    related: [
      { label: "Security", href: "/docs/security" },
      { label: "Executions", href: "/docs/executions" },
    ],
  },
  "/docs/mcp": {
    title: "MCP",
    summary:
      "MCP endpoint is available at `/api/mcp` with API-token auth, rate limiting, and tool-call audit logging.",
    highlights: [
      "Supported tools include `functions.*` and `executions.*` operations.",
      "JSON-RPC methods include initialize, tools/list, tools/call, and ping.",
      "Origin allowlisting is optional and enabled by `MCP_ALLOWED_ORIGINS`.",
      "Per-token rate limiting and audit logging are enforced for tool calls.",
    ],
    guideSections: [
      {
        title: "Endpoint and auth",
        description: "MCP traffic is served at `/api/mcp` and requires bearer API token auth.",
        bullets: [
          "Send `Authorization: Bearer <api-token>` with each request.",
          "Tokens are validated against hashed token records and expiry checks.",
        ],
      },
      {
        title: "Supported protocol methods",
        description: "Current endpoint supports these JSON-RPC methods.",
        bullets: ["`initialize`", "`tools/list`", "`tools/call`", "`ping`"],
      },
      {
        title: "Available tools",
        description: "Tool names currently implemented in hostfunc MCP handlers.",
        bullets: [
          "`functions.list`, `functions.get`, `functions.execute`",
          "`executions.list`, `executions.get`, `executions.logs`",
        ],
      },
      {
        title: "Operational controls",
        description:
          "MCP requests are protected with origin policy checks, rate limits, and tool-call audit rows.",
        bullets: [
          "Rate limit is enforced per token id.",
          "Origin checks apply only when `MCP_ALLOWED_ORIGINS` is configured.",
          "Tool calls are recorded for observability and compliance workflows.",
        ],
      },
      {
        title: "Client config example",
        description: "Example MCP client configuration using `mcp-remote`.",
        code: `{
  "mcpServers": {
    "hostfunc": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:3000/api/mcp",
        "--header",
        "Authorization: Bearer <api-token>"
      ]
    }
  }
}`,
      },
    ],
    related: [
      { label: "Security", href: "/docs/security" },
      { label: "CLI", href: "/docs/cli" },
    ],
  },
  "/docs/sdk": {
    title: "@hostfunc/sdk",
    summary:
      "The runtime SDK is split into core function APIs plus optional AI, agent, and vector modules.",
    highlights: [
      "Import core APIs from `@hostfunc/sdk` (`executeFunction`, `secret`, `log`).",
      "Import AI helpers from `@hostfunc/sdk/ai` (`askAi`, `streamAi`, `createEmbedding`).",
      "Import agent helpers from `@hostfunc/sdk/agent` (`createAgent`, `runAgent`).",
      "Import vector helpers from `@hostfunc/sdk/vector` (`upsert`, `query`, `deleteVectors`, `getNamespace`).",
    ],
    sdkGuide: {
      quickstart:
        "Use `@hostfunc/sdk` for new functions. Submodules (`/ai`, `/agent`, `/vector`) call internal APIs and require proper workspace integration setup.",
      apiReference: [
        {
          name: "fn.executeFunction",
          signature:
            "await fn.executeFunction<T = unknown>(slug: string, input?: unknown, options?: { timeoutMs?: number }): Promise<T>",
          description:
            "Invoke another function by org/slug with lineage and call-depth protection.",
          args: [
            {
              name: "slug",
              type: "string (`orgSlug/fnSlug`)",
              required: true,
              description: "Target function identifier.",
            },
            {
              name: "input",
              type: "unknown",
              required: false,
              description: "JSON-serializable payload sent to the downstream function.",
            },
            {
              name: "options.timeoutMs",
              type: "number",
              required: false,
              description: "Optional per-call timeout (bounded by runtime limits).",
            },
          ],
          returns: "Parsed downstream JSON response (or raw text for non-JSON responses).",
          throws: [
            "FN_CALL_DEPTH when depth is exceeded or cycle detected.",
            "FN_CALL_TIMEOUT when the child call exceeds timeout.",
            "FN_EXECUTE_FAILED when downstream returns non-2xx or network failure occurs.",
          ],
        },
        {
          name: "secret.get",
          signature: "await secret.get(key: string): Promise<string | null>",
          description: "Retrieve an optional secret value for the current function.",
          args: [
            {
              name: "key",
              type: "string",
              required: true,
              description: "Secret key configured in function settings.",
            },
          ],
          returns: "Secret string value or null when not configured.",
          throws: ["INFRA_EXECUTE_FAILED if secret service cannot be reached/authenticated."],
        },
        {
          name: "secret.getRequired",
          signature: "await secret.getRequired(key: string): Promise<string>",
          description:
            "Retrieve a required secret. Throws a structured missing_secret error when unset.",
          args: [
            {
              name: "key",
              type: "string",
              required: true,
              description: "Secret key configured in function settings.",
            },
          ],
          returns: "Secret string value.",
          throws: ["MISSING_SECRET when key is missing (includes key + docsUrl detail)."],
        },
      ],
      codeExamples: [
        {
          title: "Core composition pattern",
          description: "Call one function from another with a required secret.",
          code: `import fn, { secret } from "@hostfunc/sdk";

export async function main(input: { customerId: string }) {
  const apiKey = await secret.getRequired("CLAUDE_API_KEY");
  const report = await fn.executeFunction("org/generate-report", {
    customerId: input.customerId,
    apiKey,
  });
  return await fn.executeFunction("org/post-to-slack", { report, channel: "#alerts" });
}`,
        },
      ],
      bestPractices: [
        "Prefer @hostfunc/sdk for all new code; keep @hostfunc/fn only for legacy compatibility.",
        "Use org/slug identifiers, not mutable user-provided values.",
        "Keep chained payloads compact and pass IDs/references for large data.",
        "Configure integrations in `/dashboard/settings/integrations` before using AI/vector helpers.",
      ],
    },
    related: [
      { label: "AI module", href: "/docs/sdk/ai" },
      { label: "Agent module", href: "/docs/sdk/agent" },
      { label: "Vector module", href: "/docs/sdk/vector" },
    ],
  },
  "/docs/sdk/ai": {
    title: "SDK AI Module",
    summary:
      "Use `@hostfunc/sdk/ai` to call workspace AI providers for text generation and embeddings.",
    highlights: [
      "`askAi(prompt, options)` returns structured model output with usage metadata.",
      "`streamAi(prompt, options)` yields async stream chunks for incremental responses.",
      "`createEmbedding(text)` returns numeric vectors for semantic indexing and search.",
    ],
    sdkGuide: {
      apiReference: [
        {
          name: "askAi",
          signature:
            "await askAi(prompt: string | AiMessage[], options?: AiOptions): Promise<AiResponse>",
          description: "Request a non-streamed completion from the configured workspace AI model.",
          returns: "AiResponse with text, model, token usage, and finish reason.",
        },
        {
          name: "streamAi",
          signature: "for await (const chunk of streamAi(prompt, options)) { ... }",
          description:
            "Async generator for streaming model output chunks. Current implementation emits delta + done chunks.",
          returns: "AsyncGenerator<{ type: 'delta' | 'done'; text?: string; done?: boolean }>",
        },
        {
          name: "createEmbedding",
          signature:
            "await createEmbedding(text: string, options?: { model?: string }): Promise<EmbeddingResult>",
          description: "Generate an embedding vector suitable for vector upsert/query workflows.",
          returns: "EmbeddingResult containing numeric embedding array and usage metadata.",
        },
      ],
      codeExamples: [
        {
          title: "Prompt + structured options",
          description: "Use explicit model controls for deterministic summaries.",
          code: `import { askAi } from "@hostfunc/sdk/ai";

const result = await askAi(
  [
    { role: "system", content: "You summarize execution logs." },
    { role: "user", content: "Summarize this run in 3 bullets." },
  ],
  { model: "gpt-4o", temperature: 0.2, maxTokens: 300 },
);`,
        },
      ],
      bestPractices: [
        "Set low temperature for operational summaries and deterministic outputs.",
        "Generate embeddings once and cache them for repeated vector queries.",
        "Set workspace defaults first, then use per-function overrides only when a function needs isolation.",
      ],
    },
    related: [
      { label: "SDK overview", href: "/docs/sdk" },
      { label: "Vector module", href: "/docs/sdk/vector" },
    ],
  },
  "/docs/sdk/agent": {
    title: "SDK Agent Module",
    summary:
      "Use `@hostfunc/sdk/agent` to create and run autonomous jobs with structured status and step traces.",
    highlights: [
      "`createAgent(config)` provisions a queued agent run.",
      "`runAgent(config)` starts execution immediately and returns status metadata.",
      "Agent payloads support goals, model selection, tool whitelists, and max-step limits.",
    ],
    sdkGuide: {
      apiReference: [
        {
          name: "createAgent",
          signature: "await createAgent(config: AgentConfig): Promise<AgentResult>",
          description:
            "Create an agent run record and schedule execution with the given configuration.",
          returns: "AgentResult with id, status, timestamps, and step history.",
        },
        {
          name: "runAgent",
          signature: "await runAgent(config: AgentConfig): Promise<AgentResult>",
          description: "Start agent execution immediately and return the current run state.",
          returns: "AgentResult with current status and collected steps.",
        },
      ],
      codeExamples: [
        {
          title: "Simple triage agent",
          description: "Run an agent that can call selected tools/functions.",
          code: `import { runAgent } from "@hostfunc/sdk/agent";

const run = await runAgent({
  name: "incident-triage",
  goal: "Classify incidents and trigger escalation functions.",
  maxSteps: 6,
  tools: ["functions.execute", "executions.list"],
});`,
        },
      ],
      bestPractices: [
        "Set maxSteps and timeoutMs to keep agent runs bounded.",
        "Restrict tools to least-privilege capabilities for each agent role.",
        "Agent execution uses the same AI provider resolution chain as other AI helpers.",
      ],
    },
    related: [
      { label: "SDK overview", href: "/docs/sdk" },
      { label: "MCP", href: "/docs/mcp" },
    ],
  },
  "/docs/sdk/vector": {
    title: "SDK Vector Module",
    summary: "Use `@hostfunc/sdk/vector` for vector CRUD and retrieval workflows.",
    highlights: [
      "`upsert(namespace, vectors)` writes vectors and metadata.",
      "`query(namespace, embedding, options)` performs top-K similarity search.",
      "`deleteVectors(namespace, ids)` removes vectors; `getNamespace(name)` creates a scoped helper API.",
    ],
    sdkGuide: {
      apiReference: [
        {
          name: "upsert",
          signature:
            "await upsert(namespace: string, vectors: VectorRecord[]): Promise<UpsertResult>",
          description: "Insert or update vectors and metadata in a namespace.",
          returns: "UpsertResult with namespace + upserted count.",
        },
        {
          name: "query",
          signature:
            "await query(namespace: string, embedding: number[], options?: { topK?: number; includeValues?: boolean }): Promise<QueryResult>",
          description: "Execute similarity search against the namespace.",
          returns: "QueryResult containing ranked matches.",
        },
        {
          name: "deleteVectors",
          signature: "await deleteVectors(namespace: string, ids: string[]): Promise<DeleteResult>",
          description: "Delete vectors by id from a namespace.",
          returns: "DeleteResult with namespace + deleted count.",
        },
        {
          name: "getNamespace",
          signature: "const ns = getNamespace(namespace: string)",
          description:
            "Create a scoped helper object with upsert/query/delete bound to one namespace.",
          returns:
            "{ upsert(vectors), query(embedding, options), deleteVectors(ids) } helper object.",
        },
      ],
      codeExamples: [
        {
          title: "Embedding + semantic query",
          description: "Create embeddings with AI module and search nearest matches.",
          code: `import { createEmbedding } from "@hostfunc/sdk/ai";
import { upsert, query } from "@hostfunc/sdk/vector";

const { embedding } = await createEmbedding("customer profile text");
await upsert("profiles", [{ id: "cus_123", values: embedding }]);
const results = await query("profiles", embedding, { topK: 5 });`,
        },
      ],
      bestPractices: [
        "Use stable namespace names by domain (profiles, docs, incidents, etc.).",
        "Store lightweight metadata for filtering and downstream display.",
        "Tune topK based on latency/quality trade-offs for each workload.",
        "Configure vector backends in integrations settings before production usage.",
      ],
    },
    related: [
      { label: "SDK overview", href: "/docs/sdk" },
      { label: "AI module", href: "/docs/sdk/ai" },
    ],
  },
};

export function getDocsPage(path: string): DocsPageContent {
  const page = docsPages[path];
  if (!page) {
    throw new Error(`missing docs page content: ${path}`);
  }
  return page;
}

export function assertDocsContentIntegrity(): void {
  const known = new Set(Object.keys(docsPages));
  const referenced = docsSections.flatMap((section) => section.links.map((link) => link.href));
  for (const href of referenced) {
    if (!known.has(href)) {
      throw new Error(`docs nav link missing page content: ${href}`);
    }
  }
}

export function getDocsSearchIndex(): DocsSearchRecord[] {
  return Object.entries(docsPages).map(([href, page]) => ({
    href,
    title: page.title,
    summary: page.summary,
    sectionTitles: page.guideSections?.map((section) => section.title) ?? [],
  }));
}
