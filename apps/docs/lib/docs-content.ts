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
      { name: "Introduction", href: "/" },
      { name: "Getting Started", href: "/getting-started" },
    ],
  },
  {
    title: "Core Platform",
    links: [
      { name: "Functions", href: "/functions" },
      { name: "Triggers", href: "/triggers" },
      { name: "Websites", href: "/websites" },
      { name: "Custom Domains", href: "/custom-domains" },
      { name: "Marketplace", href: "/marketplace" },
      { name: "Executions", href: "/executions" },
      { name: "Limits and Plans", href: "/limits" },
    ],
  },
  {
    title: "Access and Tooling",
    links: [
      { name: "Security", href: "/security" },
      { name: "CLI", href: "/cli" },
      { name: "VS Code Extension", href: "/vscode-extension" },
      { name: "MCP", href: "/mcp" },
    ],
  },
  {
    title: "SDK",
    links: [
      { name: "@hostfunc/sdk", href: "/sdk" },
      { name: "AI module", href: "/sdk/ai" },
      { name: "Agent module", href: "/sdk/agent" },
      { name: "Vector module", href: "/sdk/vector" },
    ],
  },
];

export const docsPages: Record<string, DocsPageContent> = {
  "/": {
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
      { label: "Getting Started", href: "/getting-started" },
      { label: "Functions", href: "/functions" },
      { label: "CLI", href: "/cli" },
    ],
  },
  "/getting-started": {
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
      { label: "Functions", href: "/functions" },
      { label: "Executions and Logs", href: "/executions" },
      { label: "MCP", href: "/mcp" },
    ],
  },
  "/websites": {
    title: "Websites & Static Assets",
    summary:
      "Attach an `index.html` to a function and hostfunc serves it as a live web page at the function's run URL — static sites and dynamic pages, not just JSON APIs.",
    highlights: [
      "A function with an `index.html` asset is served as a web page at `/run/:orgSlug/:fnSlug`.",
      "CSS, JS, images, and fonts are served as sibling assets; relative links resolve automatically.",
      "`main()` still handles API and POST requests — or return a web `Response` for dynamic HTML.",
      "Assets are embedded into the deployed worker — there is no extra storage to configure.",
    ],
    guideSections: [
      {
        title: "1. Add an index.html",
        description:
          "Attach an `index.html` file to a function — drop it into the editor file tree, or start from the `HTML page` template. A browser request to the function URL renders the page instead of running `main()`.",
        bullets: [
          "The page is served at the function's run URL — `/run/:orgSlug/:fnSlug`.",
          "A function with no `index.html` still runs `main()`, so API-only functions are unchanged.",
        ],
        code: `# A function 'site' in the 'acme' org renders its index.html here:
curl https://run.hostfunc.io/run/acme/site`,
      },
      {
        title: "2. Add CSS, JS, and images",
        description:
          "Attach as many sibling assets as you need. Each is served by sub-path, and hostfunc injects a `<base>` tag so relative links resolve without hardcoding the run path.",
        bullets: [
          "A `style.css` asset is served at `/run/:orgSlug/:fnSlug/style.css`.",
          "Reference assets with relative paths like `./style.css` — the injected `<base>` makes them resolve.",
          "Supported types: HTML, CSS, JS, JSON, SVG, PNG, JPEG, GIF, WebP, ICO, and web fonts.",
        ],
      },
      {
        title: "3. Mix a website with an API",
        description:
          "A static page and a dynamic handler can live in the same function. A browser GET renders `index.html`; a POST runs `main()`. For dynamic HTML, `main()` can return a standard web `Response` instead of a JSON value.",
        code: `export async function main(input, request) {
  // Return a web Response for full control of status, headers, and body.
  return new Response("<h1>Hello from hostfunc</h1>", {
    headers: { "content-type": "text/html" },
  });
}`,
      },
      {
        title: "4. Deploy",
        description:
          "Assets are bundled into the deployed worker at deploy time, so the page is served straight from the edge with no extra infrastructure to configure. Re-deploy to publish changes.",
        bullets: [
          "Editing an asset updates the draft — deploy again to make it live.",
          "Small text assets (HTML, CSS, JS) always travel inside the worker bundle.",
        ],
      },
    ],
    related: [
      { label: "Custom Domains", href: "/custom-domains" },
      { label: "Functions", href: "/functions" },
      { label: "Triggers", href: "/triggers" },
      { label: "Getting Started", href: "/getting-started" },
    ],
  },
  "/custom-domains": {
    title: "Custom Domains",
    summary:
      "Serve a deployed website from your own domain (`www.yoursite.com`) instead of the `run.hostfunc.io` URL. hostfunc provisions and renews SSL automatically — you add a couple of DNS records and watch it go live.",
    highlights: [
      "Each domain points at one deployed website in your workspace.",
      "SSL certificates are issued and renewed automatically via Cloudflare for SaaS — no certs to manage.",
      "Subdomains (`www.example.com`) connect with a single CNAME; root domains are supported with extra DNS steps.",
      "Managed from Workspace Settings → Domains, with live status as your domain verifies.",
    ],
    guideSections: [
      {
        title: "1. Deploy the website first",
        description:
          "A custom domain attaches to a function that already serves a website. Deploy the function so it has a live version, then it becomes selectable as a domain target. See Websites for how a function serves HTML.",
        bullets: [
          "Only deployed functions in your workspace appear in the domain target picker.",
          "One domain serves one website; add more domains to point at other websites.",
        ],
      },
      {
        title: "2. Add your domain",
        description:
          "In Workspace Settings → Domains, choose Add domain, enter the hostname you own, and pick which website it should serve. hostfunc registers the hostname and returns the exact DNS records to add.",
        bullets: [
          "Enter a bare hostname — `www.example.com`, no `https://` and no path.",
          "A subdomain like `www` or `app` is the simplest to connect.",
        ],
      },
      {
        title: "3. Add the DNS records at your registrar",
        description:
          "Copy the CNAME (and any TXT validation records) into your registrar's DNS editor — Namecheap, GoDaddy, Cloudflare, etc. The Domains screen shows provider-specific hints next to each record.",
        bullets: [
          "Subdomain: add a `CNAME` from your host (e.g. `www`) to the target shown (e.g. `cname.hostfunc.app`).",
          "TXT records prove you control the domain so the SSL certificate can be issued.",
          "Root/apex domains can't use a CNAME — use your registrar's ALIAS/ANAME or CNAME-flattening to the same target, or point `www` and add an apex redirect.",
        ],
      },
      {
        title: "4. Wait for verification and SSL",
        description:
          "The Domains screen polls automatically: it moves from “Add DNS records” to “Issuing SSL” to “Live”. DNS propagation and certificate issuance can take a few minutes (occasionally longer) — you can close the page and come back.",
        bullets: [
          "“Add DNS records” — waiting for your records to be visible.",
          "“Issuing SSL” — records verified, certificate being provisioned.",
          "“Live” — your site is served at `https://yourdomain` with a valid certificate.",
        ],
      },
      {
        title: "5. Receive email on your domain",
        description:
          "Once a domain is live, the function's email trigger can use it: regenerate the inbound address on the function's Triggers page and it is issued on your domain (e.g. `site-acme-x7q2w3e4@www.example.com`). An Inbound email panel then appears on the Domains screen with the MX and TXT records to add.",
        bullets: [
          "Add the MX/TXT rows exactly as shown (in Namecheap: Domain List → Manage → Advanced DNS). The MX record must have the lowest priority value on that name.",
          "The panel polls verification automatically; once it shows “Receiving”, mail to the generated address triggers your function.",
          "Inbound email DNS is separate from the website CNAME — removing one doesn't affect the other until the domain itself is removed.",
        ],
      },
      {
        title: "6. Remove a domain",
        description:
          "Removing a domain stops routing it, deletes the hostname from Cloudflare (and its inbound-email registration), and frees it so it can be claimed again. Your website keeps serving on its `run.hostfunc.io` URL.",
      },
      {
        title: "Limits and validation",
        description: "Guardrails that apply when adding domains.",
        bullets: [
          "Up to 20 custom domains per workspace.",
          "Hostnames must be ASCII (`a-z`, digits, hyphens); internationalized/punycode (`xn--`) names aren't supported yet.",
          "`hostfunc.io`, `hostfunc.app`, and `hostfunc.dev` names are reserved.",
        ],
      },
    ],
    related: [
      { label: "Websites", href: "/websites" },
      { label: "Triggers", href: "/triggers" },
      { label: "Functions", href: "/functions" },
      { label: "Security", href: "/security" },
    ],
  },
  "/marketplace": {
    title: "Marketplace",
    summary:
      "Publish a function to the public marketplace so anyone can discover, star, discuss, and fork it. Forks copy the code into the forker's workspace with lineage back to the original.",
    highlights: [
      "Publishing needs a public function plus a marketplace profile (category, description, readme).",
      "Categories: utilities, ai, data, integrations, notifications, webhooks, automation.",
      "Stars, threaded comments, and fork counts appear on every listing.",
      "Forking copies the latest deployed code into your workspace — secrets are never copied.",
    ],
    guideSections: [
      {
        title: "Publish a function",
        description:
          "Set the function's visibility to public, then complete the marketplace profile from its settings: pick a category, write a short description, and edit the readme (Markdown with a live preview).",
        bullets: [
          "The listing shows a code preview of the deployed version, your workspace name, and the function logo.",
          "Unpublishing (or making the function private) removes the listing; existing forks keep working.",
        ],
      },
      {
        title: "Stars, comments, and forks",
        description:
          "Signed-in users can star a listing, leave threaded comments, and fork the function into their own workspace.",
        bullets: [
          "Forks record their source, and the original listing shows its fork count.",
          "A fork copies code only — you configure your own secrets, triggers, and domains.",
        ],
      },
    ],
    related: [
      { label: "Functions", href: "/functions" },
      { label: "Getting Started", href: "/getting-started" },
      { label: "Security", href: "/security" },
    ],
  },
  "/limits": {
    title: "Limits and Plans",
    summary:
      "Per-plan execution limits and platform-wide request guardrails. Limits are enforced at registration time by the control plane and at the edge by the runtime.",
    highlights: [
      "Request bodies are capped at 1 MiB — larger requests get `413 payload_too_large`.",
      "Run endpoints accept JSON object bodies (or empty); arrays and primitives are ignored.",
      "Daily execution and monthly wall-time quotas return `429` with a specific error code when exceeded.",
      "Nested `executeFunction` calls are bounded by per-plan call depth to stop runaway recursion.",
    ],
    guideSections: [
      {
        title: "Plan limits",
        description: "Current per-plan limits (Free / Pro / Team).",
        bullets: [
          "Functions per workspace: 3 / 2,000 / 20,000",
          "Executions per day: 100 / 2M / 20M",
          "Wall time per month: 5 min / 500 h / 2,000 h",
          "Wall time per execution: 10 s / 120 s / 600 s",
          "CPU time per execution: 1 s / 20 s / 120 s",
          "Memory: 128 MB / 512 MB / 2 GB",
          "Egress per execution: 1 MB / 20 MB / 200 MB",
          "Subrequests per execution: 20 / 200 / 2,000",
          "Nested call depth: 3 / 20 / 40",
          "Secrets per function: 5 / 100 / 400",
          "Team members: 1 / 6 / 50",
        ],
      },
      {
        title: "Request guardrails",
        description: "Applied to every `/run/:orgSlug/:fnSlug` request regardless of plan.",
        bullets: [
          "Inbound body limit: 1 MiB → `413 payload_too_large` when exceeded.",
          "HTTP triggers with `requireAuth` enabled need `Authorization: Bearer <workspace API token>` (paid plans).",
          "Responses include `x-hostfunc-exec-id` and `x-hostfunc-wall-ms` headers for tracing.",
        ],
      },
    ],
    related: [
      { label: "Functions", href: "/functions" },
      { label: "Executions", href: "/executions" },
      { label: "Security", href: "/security" },
    ],
  },
  "/functions": {
    title: "Functions",
    summary:
      "Functions move through draft and deployed versions. Runtime dispatch resolves deployed version metadata and executes in Cloudflare workers.",
    highlights: [
      "Deploy creates immutable versions and stores runtime handles per version.",
      "SDK composition calls (`fn.executeFunction`) preserve execution lineage.",
      "Secret access is runtime-mediated, never hardcoded in function source.",
      "Call depth is enforced to prevent recursive loops.",
    ],
    guideSections: [
      {
        title: "Logos",
        description:
          "Give a function (or your workspace) a logo from its settings page. Logos show up in the dashboard and on marketplace listings.",
        bullets: [
          "Formats: PNG, JPEG, WebP, or SVG — validated by content, not just file extension.",
          "Up to 2 MB. SVGs are checked for active content (scripts, event handlers, external references) and rejected if unsafe.",
        ],
      },
      {
        title: "Deleting a function",
        description:
          "Delete from Settings after typing the function name to confirm. Deletion is permanent — there is no undo.",
        bullets: [
          "Removes all versions, drafts, triggers, secrets, execution history, assets, and marketplace data (stars, comments, forks keep their lineage records on the source side).",
          "Deployed workers and cached routes are cleaned up best-effort in the background.",
        ],
      },
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
      { label: "Triggers", href: "/triggers" },
      { label: "Executions", href: "/executions" },
      { label: "Getting Started", href: "/getting-started" },
    ],
  },
  "/triggers": {
    title: "Triggers",
    summary:
      "Trigger config is persisted per function/kind and controls how runtime invocation is initiated.",
    highlights: [
      "Kinds: `http`, `cron`, `email`, `mcp`.",
      "Your function exports `main` (handles HTTP **and** cron) and/or `email` (email triggers) — every handler receives `(payload, request)` and may return a value (JSON) or a `Response`.",
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
          "email: `{ address: string, allowlist?: string[] }` — `address` is platform-generated as `{fn}-{workspace}-{random}@…` and can be regenerated at any time",
          "mcp: `{ toolName: string, description: string }`",
        ],
      },
      {
        title: "HTTP trigger",
        description:
          "HTTP entrypoint is runtime route `/run/:orgSlug/:fnSlug`. HTTP requests invoke your exported `main` handler.",
        bullets: [
          "HTTP is created automatically for new functions.",
          "`main(payload, request)` — `payload` is the parsed JSON body (POST/PUT) or the query params (GET). Return a plain value (JSON-serialized) or a web `Response`.",
          "When `requireAuth` is true, send `Authorization: Bearer <workspace API token>` (see Settings → Tokens).",
          "Nested calls from `executeFunction` send `x-hostfunc-parent-exec` and skip the API token when the parent execution is valid.",
        ],
        code: `export async function main(payload, request) {
  // payload = JSON body (POST/PUT) or query params (GET)
  return { hello: payload.name ?? "world" };
  // …or return a Response directly:
  // return new Response("hi", { status: 200 });
}`,
      },
      {
        title: "Cron trigger",
        description:
          "Cron worker fetches due jobs from control plane and invokes runtime with cron trigger metadata. Cron runs invoke your exported `main` — there is no separate cron handler.",
        bullets: [
          "Due/ack flow is handled by internal cron endpoints.",
          'Runtime invokes `main(payload)` with `payload.hostfuncTriggerKind === "cron"` — branch on it to tell a scheduled run apart from an HTTP request.',
        ],
        code: `export async function main(payload) {
  if (payload.hostfuncTriggerKind === "cron") {
    // scheduled run — do the periodic work
    return { ranAt: new Date().toISOString() };
  }
  // normal HTTP request
  return { ok: true };
}`,
      },
      {
        title: "Email trigger",
        description:
          "Every function can have one generated inbound address. Mail sent to it invokes your exported `email(data)` handler with the payload shape below.",
        bullets: [
          "Address format: `{function-slug}-{workspace-slug}-{random}@hostfunc.io` (slugs truncated to 20 chars, 8-char random suffix).",
          "If the function has an active custom domain with verified inbound email, new addresses are generated on that domain instead — see Custom Domains → Receive email on your domain.",
          "Regenerating replaces the address in place: the old address stops matching immediately.",
          "Optional sender allowlist — empty accepts mail from anyone; otherwise only listed senders trigger the function (case-insensitive).",
          "Your function **must export** `email` — it's a separate handler from `main`. An email trigger that hits a function without it fails with `function must export 'email' for email triggers`.",
          "`email(data, request)`; `data.email` includes `to`, `from`, `rawSize`, `timestamp` (ISO 8601), and optional `subject` / `body`. A function can export both `main` (HTTP/cron) and `email`.",
          'Local development is fully mocked: the dispatch payload is logged to the dev server console, and a dev-only "Send test email" button on the triggers page exercises the whole path without DNS or a mail provider.',
        ],
        code: `export async function email(data: {
  email: {
    from: string;
    to: string;
    rawSize: number;
    timestamp: string;
    subject?: string;
    body?: string;
  };
}) {
  return { received: data.email.subject ?? "(no subject)" };
}`,
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
      { label: "Executions", href: "/executions" },
      { label: "MCP", href: "/mcp" },
    ],
  },
  "/executions": {
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
      { label: "Triggers", href: "/triggers" },
      { label: "CLI logs", href: "/cli" },
    ],
  },
  "/security": {
    title: "Security and Access",
    summary:
      "Security is split by boundary: dashboard session auth, API-token auth for automation, and internal bearer-token controls for runtime/control-plane traffic.",
    highlights: [
      "Dashboard actions require an active session and organization context.",
      "CLI/MCP automation uses bearer API tokens validated against hashed token records.",
      "Internal runtime/control routes use shared bearer env tokens (constant-time compared) and execution callback verification.",
      "MCP supports optional origin allowlisting and per-token rate limiting.",
      "Run requests are capped at 1 MiB bodies; secret values are never returned by any API — list endpoints expose key names only.",
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
      { label: "CLI", href: "/cli" },
      { label: "MCP", href: "/mcp" },
    ],
  },
  "/vscode-extension": {
    title: "VS Code Extension",
    summary:
      "The hostfunc extension brings your functions into VS Code: browse them, deploy, run with a payload, and stream execution logs — without leaving the editor. Sign in happens in your browser; no token to copy.",
    highlights: [
      "Browser sign-in via the OAuth device flow; tokens are stored in VS Code SecretStorage, scoped per workspace.",
      "Functions explorer with deploy and run-with-payload, plus execution logs in the hostfunc Output channel.",
      "Switch between workspaces (organizations) from the status bar.",
      "Point `hostfunc.baseUrl` at localhost or a self-hosted instance for development.",
    ],
    guideSections: [
      {
        title: "1. Install",
        description:
          'Install from the Visual Studio Marketplace (and Open VSX for Cursor, Windsurf, and VSCodium). Search the Extensions view for "hostfunc", or install from the command line.',
        code: `# VS Code
code --install-extension hostfunc.hostfunc-vscode

# Cursor / Windsurf / VSCodium (Open VSX)
# Extensions view → search "hostfunc" → Install`,
      },
      {
        title: "2. Sign in",
        description:
          "Open the hostfunc view in the Activity Bar and click Sign in. A code appears and your browser opens to authorize the device — confirm the code matches, then approve.",
        bullets: [
          "The extension polls until you approve, then stores a workspace-scoped token securely.",
          "The status bar shows your active workspace; click it to switch workspaces.",
          "Run the `hostfunc: Sign Out` command to remove stored tokens.",
        ],
      },
      {
        title: "3. Deploy and run",
        description:
          "Each function in the explorer has inline actions. Deploy publishes the current draft to a live version; Run prompts for a JSON payload and invokes the deployed function.",
        bullets: [
          "Run output and execution logs stream into the hostfunc Output channel.",
          "Open in Dashboard jumps to the function's editor on the web.",
          "Refresh re-loads the function list for the active workspace.",
        ],
      },
      {
        title: "4. Inspect a function",
        description: "Expand a function node to drill into its state without leaving the editor.",
        bullets: [
          "Triggers — each configured trigger with its kind and status.",
          "Versions — recent deploys with size and status.",
          "Executions — recent runs with status and timing; copy an execution id for `hostfunc logs`.",
          "Secrets — configured key names (values are never shown or transferred).",
        ],
      },
      {
        title: "5. Local file sync",
        description:
          "Pull a function's draft into a local folder and push edits back. Saving the project's entry file pushes the draft automatically (quiet no-op for unrelated saves or signed-out sessions).",
      },
      {
        title: "Configuration",
        description: "Settings live under the `hostfunc` namespace.",
        bullets: [
          "`hostfunc.baseUrl` — control-plane URL. Defaults to `https://hostfunc.io`; set it to `http://localhost:3000` for local development.",
        ],
      },
    ],
    related: [
      { label: "CLI", href: "/cli" },
      { label: "Security", href: "/security" },
      { label: "Getting Started", href: "/getting-started" },
    ],
  },
  "/cli": {
    title: "CLI",
    summary:
      "Public npm package `@hostfunc/cli` supports login, init, list, deploy, run, logs, and secrets set flows.",
    highlights: [
      "`hostfunc login` signs you in through your browser (OAuth device flow); `--token` stays available for CI/headless.",
      "Deploy/run/logs/secrets map to `/api/cli/*` routes.",
      "CLI reads project config from `hostfunc.json` and user credentials from `~/.hostfunc`.",
      "Supported runtime is Node.js >=22 and CLI telemetry is disabled.",
    ],
    guideSections: [
      {
        title: "Install and authenticate",
        description:
          "Install the CLI globally, then sign in once per environment. `hostfunc login` opens your browser to authorize the device; use `--token` for CI or headless environments.",
        code: `npm install -g @hostfunc/cli

# Browser sign-in (recommended) — prints a code, opens your browser
hostfunc login --url https://hostfunc.io

# CI / headless — use a workspace API token instead
hostfunc login --token <api-token> --url https://hostfunc.io`,
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
          "`login` (browser) -> `POST /api/auth/device/code` + `/device/token`, then `POST /api/cli/device/exchange`",
          "`login --token` -> `GET /api/cli/login`",
          "`list` -> `GET /api/cli/functions`",
          "`deploy` -> `POST /api/cli/functions/deploy`",
          "`run` -> `POST /api/cli/functions/run`",
          "`logs` -> `GET /api/cli/executions/logs`",
          "`secrets set` -> `POST /api/cli/secrets`",
        ],
      },
    ],
    related: [
      { label: "VS Code Extension", href: "/vscode-extension" },
      { label: "Security", href: "/security" },
      { label: "Executions", href: "/executions" },
    ],
  },
  "/mcp": {
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
      { label: "Security", href: "/security" },
      { label: "CLI", href: "/cli" },
    ],
  },
  "/sdk": {
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
      { label: "AI module", href: "/sdk/ai" },
      { label: "Agent module", href: "/sdk/agent" },
      { label: "Vector module", href: "/sdk/vector" },
    ],
  },
  "/sdk/ai": {
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
      { label: "SDK overview", href: "/sdk" },
      { label: "Vector module", href: "/sdk/vector" },
    ],
  },
  "/sdk/agent": {
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
      { label: "SDK overview", href: "/sdk" },
      { label: "MCP", href: "/mcp" },
    ],
  },
  "/sdk/vector": {
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
      { label: "SDK overview", href: "/sdk" },
      { label: "AI module", href: "/sdk/ai" },
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
