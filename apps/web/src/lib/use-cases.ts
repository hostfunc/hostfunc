/**
 * Data for the `/use-cases/[slug]` landing pages. Each targets a distinct
 * search intent ("how to deploy a webhook handler", "serverless cron job",
 * "MCP tool server") with a problem framing, how hostfunc solves it, a real code
 * snippet, and links into the docs so the internal link graph stays tight.
 */

export interface UseCaseDocLink {
  label: string;
  href: string;
}

export interface UseCase {
  slug: string;
  /** Short label, e.g. "Webhook handlers". */
  name: string;
  /** <title> for the page. */
  title: string;
  /** Meta description (≤155 chars). */
  metaDescription: string;
  /** On-page H1. */
  headline: string;
  /** One-line summary shown on the index card. */
  summary: string;
  /** Lead paragraph. */
  intro: string;
  /** The problem this use case solves. */
  problem: string;
  /** How hostfunc solves it. */
  solution: string[];
  /** Primary trigger this use case uses. */
  trigger: string;
  codeFilename: string;
  code: string;
  relatedDocs: UseCaseDocLink[];
}

export const useCases: UseCase[] = [
  {
    slug: "webhooks",
    name: "Webhook handlers",
    title: "Deploy a webhook handler in TypeScript",
    metaDescription:
      "Build and deploy serverless webhook handlers in TypeScript. Every hostfunc function gets a stable HTTPS URL — wire it to Stripe, GitHub, or any provider in seconds.",
    headline: "Webhook handlers, deployed in seconds",
    summary: "Give any provider a stable HTTPS endpoint backed by typed TypeScript.",
    intro:
      "Every deployed hostfunc function gets a stable HTTPS run URL. That makes it the fastest way to stand up a webhook endpoint for Stripe, GitHub, Slack, or any service that POSTs JSON — no server, no API gateway, no boilerplate.",
    problem:
      "Webhook receivers are tiny but annoying to host: you need a public URL, request validation, secret handling for signature checks, and somewhere to see what actually arrived. Standing up a whole service for 20 lines of logic is overkill.",
    solution: [
      "Each function has a stable URL at /run/you/your-fn — paste it straight into the provider's webhook settings.",
      "Read signing secrets with secret.getRequired() to verify signatures; secrets are encrypted at rest and fetched at run time.",
      "Live log streaming shows each incoming payload as it arrives — no redeploys to debug.",
      "Compose downstream: a webhook handler can call other functions (notify, enrich, persist) via fn.executeFunction.",
    ],
    trigger: "HTTP",
    codeFilename: "stripe-webhook.ts",
    code: `import fn, { secret } from "@hostfunc/sdk";

// POST endpoint — paste the run URL into Stripe's webhook settings.
export async function main(event: { type: string; data: unknown }) {
  const signingSecret = await secret.getRequired("STRIPE_WEBHOOK_SECRET");
  // ...verify the signature with signingSecret...

  if (event.type === "checkout.session.completed") {
    await fn.executeFunction("you/slack-notify", {
      channel: "#sales",
      text: "New checkout completed 🎉",
    });
  }

  return { received: true };
}`,
    relatedDocs: [
      { label: "Triggers", href: "/docs/triggers" },
      { label: "Functions", href: "/docs/functions" },
      { label: "Getting started", href: "/docs/getting-started" },
    ],
  },
  {
    slug: "scheduled-jobs",
    name: "Scheduled jobs & cron",
    title: "Run a serverless cron job in TypeScript",
    metaDescription:
      "Schedule TypeScript functions with standard 5-field cron expressions. hostfunc runs them on time, every time — uptime checks, reports, digests, cleanups.",
    headline: "Scheduled jobs and cron, without a server",
    summary: "Standard 5-field cron expressions, timezone-aware, unified observability.",
    intro:
      "Add a cron schedule to any function and hostfunc fires it on time — every minute, every night, every Monday. It's the simplest way to run uptime checks, digests, reports, and cleanup jobs without managing a scheduler.",
    problem:
      "Cron is everywhere and yet annoying in the cloud: you wire up a scheduler, a queue, a worker, and monitoring — just to run a function on an interval. Most teams end up with a fragile mix of cron daemons and one-off Lambdas.",
    solution: [
      "Set a standard 5-field cron expression and a timezone right in the Triggers tab.",
      "The cron worker dispatches through the same path as HTTP — one unified observability pipeline.",
      "Every run is recorded with CPU, wall time, memory, and egress metrics.",
      "Compose: a nightly job can fan out to other functions and watch the lineage graph fill in.",
    ],
    trigger: "Cron",
    codeFilename: "uptime-check.ts",
    code: `import fn from "@hostfunc/sdk";

// In the Triggers tab:
//   schedule: "*/5 * * * *"   timezone: "Europe/London"
export async function main() {
  const res = await fetch("https://you.dev/health");
  if (!res.ok) {
    await fn.executeFunction("you/slack-notify", {
      channel: "#alerts",
      text: \`Health check failed: \${res.status}\`,
    });
  }
  return { status: res.status, checkedAt: Date.now() };
}`,
    relatedDocs: [
      { label: "Triggers", href: "/docs/triggers" },
      { label: "Executions", href: "/docs/executions" },
      { label: "Functions", href: "/docs/functions" },
    ],
  },
  {
    slug: "ai-agents",
    name: "AI agents & MCP tools",
    title: "Build AI agent tools with MCP",
    metaDescription:
      "Turn TypeScript functions into MCP tools any LLM can call. hostfunc is agent-native — Claude can list, write, run, and compose your functions, with scratch functions on a TTL.",
    headline: "AI agents and MCP tools, natively",
    summary: "Let Claude (or any MCP client) create, run, and compose your functions as tools.",
    intro:
      "hostfunc is the first function platform built for agents. Its MCP server exposes your functions as tools any LLM can call — list, read, write, run, debug — using the same handlers the dashboard uses. Agents can even create scratch functions that auto-delete on a TTL.",
    problem:
      "Giving an LLM real capabilities means writing and hosting tools, then wiring an MCP server, auth, rate limits, and an audit trail. Building that glue layer is most of the work — and it's the same every time.",
    solution: [
      "Built-in MCP server at /api/mcp — paste a token into Claude Desktop and the model has 9 tools instantly.",
      "Scratch functions: the agent creates a one-off function that returns a result and self-destructs on a TTL.",
      "Every fn-to-fn call is recorded, so you can watch an agent compose your graph in real time.",
      "Same auth, rate limits, and audit trail across the dashboard, CLI, and MCP — no separate surface to secure.",
    ],
    trigger: "MCP",
    codeFilename: "claude_desktop_config.json",
    code: `{
  "mcpServers": {
    "hostfunc": {
      "url": "https://hostfunc.io/api/mcp",
      "headers": { "Authorization": "Bearer hf_live_…" }
    }
  }
}`,
    relatedDocs: [
      { label: "MCP", href: "/docs/mcp" },
      { label: "SDK · AI module", href: "/docs/sdk/ai" },
      { label: "SDK · Agent module", href: "/docs/sdk/agent" },
    ],
  },
  {
    slug: "slack-bots",
    name: "Slack & chat bots",
    title: "Build a Slack bot in TypeScript",
    metaDescription:
      "Deploy Slack, Telegram, and chat bots as serverless TypeScript functions. Handle slash commands and webhooks with encrypted tokens and a stable URL.",
    headline: "Slack and chat bots, the easy way",
    summary: "Slash commands, notifications, and chat workflows on a stable endpoint.",
    intro:
      "Chat bots are mostly small functions reacting to events — perfect for hostfunc. Point a Slack slash command or event subscription at your function's URL, store the bot token as an encrypted secret, and you're live.",
    problem:
      "Bots need a public endpoint, token storage, and quick responses to verification challenges. Hosting that — plus keeping the token out of your code — usually means a server you'd rather not run.",
    solution: [
      "Give Slack your function's stable run URL for slash commands or the Events API.",
      "Store the bot token with secret.getRequired() — encrypted at rest, never in your source.",
      "Reuse a shared org connector so every bot function in your workspace can post messages.",
      "Compose with AI functions to summarize threads or draft replies before posting.",
    ],
    trigger: "HTTP",
    codeFilename: "slack-command.ts",
    code: `import { secret } from "@hostfunc/sdk";

// Slash command endpoint — set as the Request URL in your Slack app.
export async function main(payload: { command: string; text: string }) {
  const token = await secret.getRequired("SLACK_BOT_TOKEN");
  // ...call chat.postMessage with token...
  return {
    response_type: "in_channel",
    text: \`Ran \${payload.command} with: \${payload.text}\`,
  };
}`,
    relatedDocs: [
      { label: "Triggers", href: "/docs/triggers" },
      { label: "Functions", href: "/docs/functions" },
      { label: "Security", href: "/docs/security" },
    ],
  },
  {
    slug: "scraping",
    name: "Scraping & data extraction",
    title: "Scrape and extract data with TypeScript functions",
    metaDescription:
      "Fetch, parse, and transform data on a schedule with serverless TypeScript functions. RSS, web pages, and APIs — with SSRF-filtered egress built in.",
    headline: "Scraping and data extraction at the edge",
    summary: "Fetch, parse, and transform pages and feeds — on demand or on a schedule.",
    intro:
      "Pair an HTTP or cron trigger with a fetch and you have a data pipeline: scrape a page, aggregate an RSS feed, unfurl a URL, or normalize a third-party API. Every outbound request is SSRF-filtered and byte-counted automatically.",
    problem:
      "Scrapers are simple to write and a pain to operate: they need scheduling, retries, egress control, and somewhere safe to run untrusted fetches. Running them on your own servers risks SSRF and surprise bandwidth bills.",
    solution: [
      "Every outbound fetch passes through an egress worker that blocks private-network targets and counts bytes.",
      "Run on demand via HTTP or on a schedule via cron — same function, just a trigger change.",
      "Parse and transform inline; return clean JSON other functions or clients can consume.",
      "Per-execution metrics show exactly how much egress and CPU each scrape used.",
    ],
    trigger: "HTTP or Cron",
    codeFilename: "rss-aggregate.ts",
    code: `// Fetch and normalize an RSS feed into clean JSON.
export async function main(input: { feedUrl: string }) {
  const xml = await fetch(input.feedUrl).then((r) => r.text());
  const items = [...xml.matchAll(/<item>([\\s\\S]*?)<\\/item>/g)].map((m) => ({
    title: /<title>(.*?)<\\/title>/.exec(m[1])?.[1] ?? "",
    link: /<link>(.*?)<\\/link>/.exec(m[1])?.[1] ?? "",
  }));
  return { count: items.length, items: items.slice(0, 20) };
}`,
    relatedDocs: [
      { label: "Functions", href: "/docs/functions" },
      { label: "Security", href: "/docs/security" },
      { label: "Executions", href: "/docs/executions" },
    ],
  },
  {
    slug: "api-endpoints",
    name: "Custom API endpoints",
    title: "Build custom API endpoints in TypeScript",
    metaDescription:
      "Ship typed JSON API endpoints as serverless TypeScript functions. Stable URLs, encrypted secrets, and composition — no framework or server required.",
    headline: "Custom API endpoints, one function each",
    summary: "Typed JSON endpoints with stable URLs — compose them into a backend.",
    intro:
      "Sometimes you just need an endpoint: enrich a lead, convert a currency, transform a JSON payload. With hostfunc each endpoint is one function with a stable URL — and because functions compose, a handful of them becomes a small backend.",
    problem:
      "Spinning up a framework, routing, and a deploy pipeline for a single JSON endpoint is heavy. But scattering one-off endpoints across providers makes them impossible to observe or reuse.",
    solution: [
      "Each endpoint is a single function with typed input and a stable run URL.",
      "Call other functions with fn.executeFunction to build composite APIs — depth-tracked and recorded.",
      "Store API keys as encrypted secrets and share them across the org via connectors.",
      "One observability pipeline across every endpoint: CPU, wall, memory, egress, per call.",
    ],
    trigger: "HTTP",
    codeFilename: "convert.ts",
    code: `import { secret } from "@hostfunc/sdk";

// GET/POST endpoint: { "from": "USD", "to": "EUR", "amount": 100 }
export async function main(input: { from: string; to: string; amount: number }) {
  const apiKey = await secret.getRequired("FX_API_KEY");
  const rates = await fetch(
    \`https://api.example.com/latest?base=\${input.from}&apikey=\${apiKey}\`,
  ).then((r) => r.json());
  const rate = rates[input.to];
  return { from: input.from, to: input.to, amount: input.amount, result: input.amount * rate };
}`,
    relatedDocs: [
      { label: "Functions", href: "/docs/functions" },
      { label: "Getting started", href: "/docs/getting-started" },
      { label: "CLI", href: "/docs/cli" },
    ],
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return useCases.find((u) => u.slug === slug);
}
