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

export const docsSections: DocsSection[] = [
  {
    title: "Getting Started",
    links: [
      { name: "Introduction", href: "/docs" },
      { name: "Getting Started", href: "/docs/getting-started" },
    ],
  },
  {
    title: "Platform",
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
];

export const docsPages: Record<string, DocsPageContent> = {
  "/docs": {
    title: "Hostfunc Documentation",
    summary:
      "Hostfunc provides a dashboard-first control plane for TypeScript functions with deploy, runtime, observability, API-token tooling, and MCP integrations.",
    highlights: [
      "Dashboard function creation, draft save, and deploy flows are available now.",
      "Triggers support HTTP, cron, email, and MCP metadata with org-scoped settings.",
      "Execution history, logs, and filtering are available in dashboard and API routes.",
      "API tokens and MCP endpoint are implemented for external tooling access.",
    ],
    related: [
      { label: "Go to dashboard", href: "/dashboard" },
      { label: "View triggers docs", href: "/docs/triggers" },
      { label: "View CLI docs", href: "/docs/cli" },
    ],
  },
  "/docs/getting-started": {
    title: "Getting Started",
    summary:
      "Set up hostfunc end-to-end: create your workspace, install tooling, build your first function with the SDK, enable MCP, and run production-ready workflows.",
    highlights: [
      "Dashboard and CLI workflows are both supported from day one.",
      "Use `@hostfunc/fn` for function composition and secure secret access.",
      "MCP lets AI tools invoke your functions through token-authenticated endpoints.",
      "Executions, logs, and trigger metadata are available immediately after deploy.",
    ],
    guideSections: [
      {
        title: "1) Create your first function",
        description:
          "Choose your preferred entry point: dashboard, CLI, or AI-assisted generation (coming soon).",
        bullets: [
          "Dashboard: open `/dashboard/new`, choose a slug, and start editing immediately.",
          "CLI: initialize a function target with `hostfunc init --fnId <fn_id>` and deploy from terminal.",
          "AI agent (coming soon): describe intent and let hostfunc generate a first draft function.",
        ],
        code: `# Dashboard flow
# 1) Open /dashboard/new
# 2) Create function
# 3) Write code and deploy

# CLI flow
hostfunc init --fnId <fn_id>
hostfunc deploy`,
      },
      {
        title: "2) Build and deploy from the editor",
        description:
          "Save draft code, configure secrets in settings, then deploy an immutable runtime version.",
        bullets: [
          "Drafts are autosaved in the editor and can be iterated quickly.",
          "Add encrypted secrets in Function Settings before first production deploy.",
          "After deploy, invoke your runtime route at `/run/:owner/:slug`.",
        ],
        code: `import fn, { secret } from "@hostfunc/fn";

export async function main(input: { name?: string }) {
  const apiKey = await secret.getRequired("CLAUDE_API_KEY");
  const greeting = input.name ?? "world";

  return {
    ok: true,
    greeting: \`hello \${greeting}\`,
    hasApiKey: Boolean(apiKey),
  };
}`,
      },
      {
        title: "3) Install and use the in-function SDK",
        description: "The SDK is provided by hostfunc runtime as `@hostfunc/fn`.",
        bullets: [
          "Default export `fn` exposes composition APIs like `executeFunction`.",
          "Named export `secret` provides secure secret retrieval inside runtime.",
          "Use `owner/slug` targets for cross-function calls.",
        ],
        code: `import fn, { secret } from "@hostfunc/fn";

export async function main(input: { orderId: string }) {
  const token = await secret.getRequired("INTERNAL_TOKEN");

  const receipt = await fn.executeFunction("my-org/create-receipt", {
    orderId: input.orderId,
    token,
  });

  return await fn.executeFunction("my-org/notify-receipt", { receipt });
}`,
      },
      {
        title: "4) Configure secrets and environment safely",
        description:
          "Keep credentials in hostfunc secrets. Never hardcode secrets or print them in logs.",
        bullets: [
          "Use `secret.getRequired` for mandatory credentials.",
          "Use `secret.get` only when absence is an expected runtime branch.",
          "Rotate secrets through function settings without redeploying source code.",
        ],
      },
      {
        title: "5) Set up CLI workflow",
        description: "Automate deploy, run, logs, and secret updates from terminals and CI.",
        bullets: [
          "Authenticate once with an org API token.",
          "Initialize with `hostfunc.json` for function targeting.",
          "Use CLI routes for repeatable release pipelines.",
        ],
        code: `npm install -g @hostfunc/cli

hostfunc login --token <api-token> --url http://localhost:3000
hostfunc init --fnId <fn_id>
hostfunc deploy
hostfunc run --payload ./payload.json
hostfunc logs --executionId <execution_id>
hostfunc secrets set CLAUDE_API_KEY <value>`,
      },
      {
        title: "6) Enable MCP for AI tooling",
        description:
          "Connect AI clients to hostfunc via MCP so tools can invoke functions and inspect executions.",
        bullets: [
          "MCP endpoint: `/api/mcp`.",
          "Authenticate with API tokens and enforce allowlisted origins.",
          "Use MCP for controlled tool calls from editors/agents.",
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
      {
        title: "7) Operate with observability",
        description: "After deployment, use executions and logs to monitor behavior and failures.",
        bullets: [
          "Track statuses (`ok`, `fn_error`, `limit_exceeded`, `infra_error`).",
          "Filter by trigger type (`http`, `cron`, `email`, `mcp`, `fn_call`).",
          "Use execution detail + live logs to debug downstream chaining issues quickly.",
        ],
      },
    ],
    related: [
      { label: "Function settings", href: "/docs/functions" },
      { label: "MCP setup", href: "/docs/mcp" },
      { label: "CLI reference", href: "/docs/cli" },
      { label: "Executions and logs", href: "/docs/executions" },
      { label: "Security and tokens", href: "/docs/security" },
    ],
  },
  "/docs/functions": {
    title: "Functions",
    summary:
      "Functions are stored as drafts and immutable deployed versions with org tenancy boundaries and a built-in runtime SDK.",
    highlights: [
      "Drafts are user-scoped and saved before deploy.",
      "Deploy creates `fn_version` records and updates current version pointers.",
      'Use `import fn, { secret } from "@hostfunc/fn"` for in-function APIs.',
      'Chain calls with `await fn.executeFunction("owner/slug", payload)`.',
      'Load secrets with `await secret.getRequired("KEY")` from function settings.',
    ],
    sdkGuide: {
      quickstart:
        "Import the SDK once per function file. Use `fn.executeFunction` for function-to-function composition and `secret.get`/`secret.getRequired` for runtime secrets.",
      apiReference: [
        {
          name: "fn.executeFunction",
          signature:
            "await fn.executeFunction(slug: string, input?: Record<string, unknown>): Promise<unknown>",
          description:
            "Invokes another Hostfunc function through the control plane. This preserves execution lineage and records trigger kind as `fn_call` in downstream executions.",
          args: [
            {
              name: "slug",
              type: "string (`owner/slug`)",
              required: true,
              description:
                "Target function identifier. Must include owner and function slug separated by a slash.",
            },
            {
              name: "input",
              type: "Record<string, unknown>",
              required: false,
              description:
                "JSON-serializable payload forwarded to the downstream function as its `main` input.",
            },
          ],
          returns:
            "Parsed JSON value returned by the downstream function. If the callee returns no value, this resolves to `null`.",
          throws: [
            "HostfuncError(FN_NOT_FOUND): slug is malformed and does not follow `owner/slug`.",
            "HostfuncError(FN_CALL_DEPTH): call chain depth exceeded or loop detected.",
            "HostfuncError(FN_THREW): downstream invocation returned a non-2xx response.",
          ],
          notes: [
            "Call depth is enforced by runtime headers to prevent recursive loops.",
            "Use small payloads and pass references/ids instead of large blobs for better latency.",
          ],
        },
        {
          name: "secret.get",
          signature: "await secret.get(key: string): Promise<string | null>",
          description:
            "Fetches an encrypted secret configured in Function Settings. Returns `null` when the secret key is missing.",
          args: [
            {
              name: "key",
              type: "string",
              required: true,
              description: "Secret key name exactly as configured in the dashboard.",
            },
          ],
          returns: "Secret value as string, or `null` when not set.",
          throws: [
            "HostfuncError(INFRA_EXECUTE_FAILED): runtime cannot contact the control plane or auth headers are invalid.",
          ],
        },
        {
          name: "secret.getRequired",
          signature: "await secret.getRequired(key: string): Promise<string>",
          description:
            "Strict secret fetch helper. Use this when the function cannot run without a specific secret.",
          args: [
            {
              name: "key",
              type: "string",
              required: true,
              description: "Secret key name exactly as configured in the dashboard.",
            },
          ],
          returns: "Secret value as string.",
          throws: [
            "HostfuncError(FN_THREW): required secret is missing.",
            "HostfuncError(INFRA_EXECUTE_FAILED): runtime cannot fetch secrets from the control plane.",
          ],
          notes: ["Prefer this method for API keys and credentials required on every invocation."],
        },
      ],
      codeExamples: [
        {
          title: "Canonical SDK import and composition",
          description:
            "Baseline pattern for functions that read secrets and invoke another function.",
          code: `import fn, { secret } from "@hostfunc/fn";

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
        {
          title: "Safe optional secret fallback",
          description:
            "Use `secret.get` when a secret is optional and you want an explicit fallback behavior.",
          code: `import fn, { secret } from "@hostfunc/fn";

export async function main(input: { orderId: string }) {
  const webhookUrl = await secret.get("OPTIONAL_WEBHOOK_URL");
  const result = await fn.executeFunction("my-org/create-order-event", {
    orderId: input.orderId,
  });

  if (!webhookUrl) {
    return { delivered: false, reason: "missing_optional_webhook", result };
  }

  return await fn.executeFunction("my-org/send-webhook", {
    webhookUrl,
    result,
  });
}`,
        },
        {
          title: "Chaining guardrails and slug validation",
          description:
            "Recommended defensive handling for user-provided slugs before invoking downstream functions.",
          code: `import fn from "@hostfunc/fn";

function isValidSlug(value: string) {
  return /^[a-z0-9-]+\\/[a-z0-9-]+$/i.test(value);
}

export async function main(input: { targetSlug: string; payload?: Record<string, unknown> }) {
  if (!isValidSlug(input.targetSlug)) {
    return { ok: false, error: "invalid_target_slug" };
  }

  try {
    const data = await fn.executeFunction(input.targetSlug, input.payload ?? {});
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "execute_failed",
    };
  }
}`,
        },
      ],
      bestPractices: [
        "Keep chained functions small and single-purpose; compose behavior by passing concise JSON payloads.",
        "Use stable `owner/slug` identifiers rather than user input whenever possible.",
        "Treat `secret.getRequired` failures as configuration problems and return actionable errors.",
        "Avoid passing raw secret values to unrelated downstream functions unless absolutely required.",
        "Design downstream functions to be idempotent so retries do not duplicate side effects.",
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
      "Trigger configuration supports `http`, `cron`, `email`, and `mcp` kinds with one configuration per kind per function.",
    highlights: [
      "New functions are initialized with a default HTTP trigger configuration.",
      "Cron and email trigger dispatch workers invoke runtime using internal control-plane routes.",
      "Function-to-function calls are recorded as `fn_call` in execution metadata.",
      "MCP trigger config is stored in metadata; MCP execution currently routes through tool handlers.",
    ],
    guideSections: [
      {
        title: "Trigger kinds and config schema",
        description:
          "Hostfunc persists a single trigger config per kind for each function (`fnId + kind` uniqueness).",
        bullets: [
          "http: `{ requireAuth: boolean }`",
          "cron: `{ schedule: string, timezone?: string }`",
          "email: `{ address: string, allowlist?: string[] }`",
          "mcp: `{ toolName: string, description: string }`",
        ],
      },
      {
        title: "HTTP trigger",
        description: "HTTP runtime entry point is `/run/:owner/:slug`.",
        bullets: [
          "HTTP is created automatically for new functions.",
          "Use this route for manual testing and CLI `run` operations.",
        ],
      },
      {
        title: "Cron trigger",
        description:
          "Cron worker fetches due jobs from control plane and invokes runtime with cron trigger metadata.",
        bullets: [
          "Due/ack flow is handled by internal cron endpoints.",
          "Execution rows are tagged with `triggerKind: cron` when cron workers invoke runtime.",
        ],
      },
      {
        title: "Email trigger",
        description:
          "Inbound email route matches recipient address + optional allowlist, then invokes runtime.",
        bullets: [
          "Allowlist is optional and restricts sender addresses when configured.",
          "Matched email triggers are recorded with `triggerKind: email`.",
        ],
      },
      {
        title: "MCP-related triggering",
        description:
          "MCP tool calls can execute functions through API handlers. Treat MCP as tooling surface with audited calls.",
        bullets: [
          "MCP tools include function execution operations.",
          "MCP trigger metadata config exists in trigger model for function-level metadata.",
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
      "Execution history, status, metrics, and log streaming are available through dashboard views and API routes.",
    highlights: [
      "List/filter executions by status, trigger kind, and date range.",
      "Execution details include metrics and error context.",
      "Live logs stream via SSE endpoint for execution detail views.",
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
        title: "Live logs and ingestion",
        description:
          "Runtime ingest writes logs and metrics, then live log streams are delivered over SSE.",
        bullets: [
          "SSE route: `/api/logs/:execId`.",
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
      "Auth is separated by boundary: session-based dashboard access, API-token automation, and internal runtime/control-plane authentication.",
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
      "The @hostfunc/cli package supports authenticated function workflows for login, init, list, deploy, run, logs, and secrets.",
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
          "login -> `GET /api/cli/login`",
          "list -> `GET /api/cli/functions`",
          "deploy -> `POST /api/cli/functions/deploy`",
          "run -> `POST /api/cli/functions/run`",
          "logs -> `GET /api/cli/executions/logs`",
          "secrets set -> `POST /api/cli/secrets`",
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
      "MCP endpoint is available at `/api/mcp` with API-token auth, request validation, rate limiting, and audit logging.",
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
