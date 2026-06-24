/**
 * Data for the `/compare/[competitor]` landing pages. Each entry targets
 * high-intent comparison queries ("hostfunc vs X", "X alternative") with an honest
 * feature matrix and a candid "when to pick them" section — accuracy builds trust
 * (and the E-E-A-T signals search engines reward) far better than one-sided spin.
 */

export interface ComparisonRow {
  capability: string;
  hostfunc: string;
  competitor: string;
}

export interface Comparison {
  slug: string;
  /** Proper-cased competitor name, e.g. "Val Town". */
  competitor: string;
  /** <title> for the page. */
  title: string;
  /** Meta description (≤155 chars). */
  metaDescription: string;
  /** On-page H1. */
  headline: string;
  /** Lead paragraph. */
  intro: string;
  rows: ComparisonRow[];
  /** Honest reasons a reader might choose the competitor. */
  whenToPickThem: string[];
  /** Reasons to choose hostfunc. */
  whenToPickHostfunc: string[];
}

export const comparisons: Comparison[] = [
  {
    slug: "val-town",
    competitor: "Val Town",
    title: "hostfunc vs Val Town",
    metaDescription:
      "hostfunc vs Val Town: compare TypeScript function hosting, triggers, agent/MCP support, composition, and self-hosting. An honest side-by-side.",
    headline: "hostfunc vs Val Town",
    intro:
      "Val Town pioneered the idea of writing and running small TypeScript functions straight from the browser. hostfunc takes the same write-a-function-and-deploy ergonomics and builds it for the agent era: an MCP server that lets Claude create, run, and compose your functions as tools, a live lineage graph, and a platform you can fully self-host under AGPL-3.0.",
    rows: [
      {
        capability: "Language",
        hostfunc: "TypeScript-first",
        competitor: "TypeScript / JavaScript",
      },
      {
        capability: "Runtime",
        hostfunc: "Isolated V8 on Cloudflare Workers",
        competitor: "Deno-based",
      },
      {
        capability: "Triggers",
        hostfunc: "HTTP, cron, email, MCP",
        competitor: "HTTP, cron, email",
      },
      {
        capability: "Agent / MCP native",
        hostfunc: "Built-in MCP server, scratch functions",
        competitor: "Not MCP-native",
      },
      {
        capability: "Composition + lineage",
        hostfunc: "fn.executeFunction with a live lineage graph",
        competitor: "Functions can import each other; no lineage view",
      },
      {
        capability: "Marketplace",
        hostfunc: "Public, forkable function marketplace",
        competitor: "Public vals you can fork",
      },
      {
        capability: "Self-host",
        hostfunc: "Yes — Docker Compose, your Cloudflare account",
        competitor: "Hosted only",
      },
      { capability: "License", hostfunc: "Open source (AGPL-3.0)", competitor: "Proprietary" },
      { capability: "Free tier", hostfunc: "100 executions/day", competitor: "Generous free tier" },
    ],
    whenToPickThem: [
      "You want the most mature browser-first editing experience with a large existing community of public vals.",
      "You don't need MCP/agent integration or a self-hostable deployment.",
      "You prefer a Deno-based runtime and its standard library.",
    ],
    whenToPickHostfunc: [
      "You want agents (Claude or any MCP client) to create, run, and compose functions as first-class tools.",
      "You want to watch functions compose into systems via a live lineage graph.",
      "You need the option to self-host the entire platform on your own Cloudflare account.",
    ],
  },
  {
    slug: "deno-deploy",
    competitor: "Deno Deploy",
    title: "hostfunc vs Deno Deploy",
    metaDescription:
      "hostfunc vs Deno Deploy: TypeScript at the edge, but hostfunc adds an MCP server, a function marketplace, composition lineage, and self-hosting.",
    headline: "hostfunc vs Deno Deploy",
    intro:
      "Deno Deploy runs TypeScript and JavaScript on a global edge network with a clean deploy story. hostfunc is higher-level: instead of shipping a server you wire up yourself, you export a single main() and get triggers, encrypted secrets, an MCP server, a forkable marketplace, and a composition lineage graph out of the box — and you can self-host it.",
    rows: [
      {
        capability: "Language",
        hostfunc: "TypeScript-first",
        competitor: "TypeScript / JavaScript",
      },
      {
        capability: "Programming model",
        hostfunc: "Export one main() per function",
        competitor: "Bring your own HTTP server / handler",
      },
      {
        capability: "Triggers",
        hostfunc: "HTTP, cron, email, MCP — all unified",
        competitor: "HTTP; cron via separate config",
      },
      {
        capability: "Agent / MCP native",
        hostfunc: "Built-in MCP server",
        competitor: "Not built-in",
      },
      {
        capability: "Secrets",
        hostfunc: "Encrypted secrets, fetched at run time",
        competitor: "Environment variables",
      },
      {
        capability: "Marketplace",
        hostfunc: "Public, forkable functions",
        competitor: "None",
      },
      { capability: "Self-host", hostfunc: "Yes — Docker Compose", competitor: "Hosted only" },
      {
        capability: "License",
        hostfunc: "Open source (AGPL-3.0)",
        competitor: "Proprietary platform",
      },
    ],
    whenToPickThem: [
      "You're already invested in the Deno ecosystem and want raw, low-level control of an edge server.",
      "You're deploying full applications rather than small composable functions.",
      "You don't need a marketplace, MCP, or self-hosting.",
    ],
    whenToPickHostfunc: [
      "You want to ship a single function fast, without standing up a server or handler yourself.",
      "You want agent/MCP access and a forkable marketplace built in.",
      "You want one unified observability pipeline across HTTP, cron, email, and MCP triggers.",
    ],
  },
  {
    slug: "vercel-functions",
    competitor: "Vercel Functions",
    title: "hostfunc vs Vercel Functions",
    metaDescription:
      "hostfunc vs Vercel Functions: hostfunc deploys standalone TypeScript functions with MCP, cron, email, a marketplace, and self-hosting — not tied to a frontend.",
    headline: "hostfunc vs Vercel Functions",
    intro:
      "Vercel Functions are excellent when they live next to a Next.js app — they're part of a frontend deployment. hostfunc is a standalone function platform: every function is its own deployable unit with a stable URL, triggers, secrets, and an MCP interface, with no frontend project required. And hostfunc is open source and self-hostable.",
    rows: [
      { capability: "Language", hostfunc: "TypeScript-first", competitor: "JS / TS and others" },
      {
        capability: "Deploy unit",
        hostfunc: "Standalone function, stable run URL",
        competitor: "Functions inside a Vercel project",
      },
      {
        capability: "Triggers",
        hostfunc: "HTTP, cron, email, MCP",
        competitor: "HTTP; cron via vercel.json",
      },
      {
        capability: "Agent / MCP native",
        hostfunc: "Built-in MCP server + scratch functions",
        competitor: "Not built-in",
      },
      {
        capability: "Composition + lineage",
        hostfunc: "fn.executeFunction with live lineage",
        competitor: "No first-class composition graph",
      },
      {
        capability: "Marketplace",
        hostfunc: "Public, forkable functions",
        competitor: "Templates, not forkable fns",
      },
      { capability: "Self-host", hostfunc: "Yes — Docker Compose", competitor: "Hosted only" },
      { capability: "License", hostfunc: "Open source (AGPL-3.0)", competitor: "Proprietary" },
    ],
    whenToPickThem: [
      "Your functions are tightly coupled to a Next.js or other frontend already deployed on Vercel.",
      "You want Vercel's broader frontend platform, preview deployments, and ecosystem.",
      "You don't need MCP, a function marketplace, or self-hosting.",
    ],
    whenToPickHostfunc: [
      "You want backend functions that stand on their own, independent of any frontend.",
      "You want agents to call your functions as MCP tools.",
      "You want an open-source platform you can run on your own infrastructure.",
    ],
  },
  {
    slug: "aws-lambda",
    competitor: "AWS Lambda",
    title: "hostfunc vs AWS Lambda",
    metaDescription:
      "hostfunc vs AWS Lambda: skip IAM, API Gateway, and IaC. Export one main() and get a URL, triggers, secrets, MCP, and a marketplace in seconds.",
    headline: "hostfunc vs AWS Lambda",
    intro:
      "AWS Lambda is the most powerful and configurable serverless platform there is — and that power comes with IAM, API Gateway, VPCs, and infrastructure-as-code. hostfunc trades that ceiling for speed: export a single main() and you have a live URL with triggers, encrypted secrets, an MCP server, and observability in seconds, with zero ops.",
    rows: [
      {
        capability: "Languages",
        hostfunc: "TypeScript-first",
        competitor: "Many (Node, Python, Go, …)",
      },
      {
        capability: "Setup",
        hostfunc: "Write main(), deploy — no infra config",
        competitor: "IAM, API Gateway, IaC / console",
      },
      {
        capability: "Triggers",
        hostfunc: "HTTP, cron, email, MCP — built in",
        competitor: "Via API Gateway, EventBridge, SES, …",
      },
      {
        capability: "Agent / MCP native",
        hostfunc: "Built-in MCP server",
        competitor: "Not built-in",
      },
      {
        capability: "Secrets",
        hostfunc: "Encrypted secrets UI, run-time fetch",
        competitor: "Secrets Manager / SSM (separate setup)",
      },
      {
        capability: "Cold start model",
        hostfunc: "V8 isolates (fast cold start)",
        competitor: "Containers / micro-VMs",
      },
      { capability: "Marketplace", hostfunc: "Public, forkable functions", competitor: "None" },
      { capability: "Self-host", hostfunc: "Yes — Docker Compose", competitor: "AWS-managed only" },
    ],
    whenToPickThem: [
      "You need deep AWS integration, many language runtimes, or fine-grained IAM and VPC control.",
      "You're building large, complex systems where infrastructure-as-code is a requirement.",
      "You need enterprise compliance and SLAs that a managed cloud provides.",
    ],
    whenToPickHostfunc: [
      "You want to ship a function in seconds without touching IAM, API Gateway, or Terraform.",
      "You want agent/MCP access and composition lineage built in.",
      "You value fast V8 isolate cold starts and a single, unified observability pipeline.",
    ],
  },
  {
    slug: "cloudflare-workers",
    competitor: "Cloudflare Workers",
    title: "hostfunc vs Cloudflare Workers",
    metaDescription:
      "hostfunc vs Cloudflare Workers: hostfunc runs on Workers but adds a web editor, MCP server, encrypted secrets, a marketplace, and composition lineage.",
    headline: "hostfunc vs Cloudflare Workers",
    intro:
      "hostfunc actually runs your functions on Cloudflare Workers — so this isn't really a head-to-head, it's a question of layers. Raw Workers give you a fast global runtime and Wrangler. hostfunc adds the platform on top: a web editor with one-click deploy, encrypted secrets, unified triggers, an MCP server, a forkable marketplace, and a live composition graph — without you managing Wrangler config, KV bindings, or dispatch namespaces.",
    rows: [
      {
        capability: "Runtime",
        hostfunc: "Cloudflare Workers (under the hood)",
        competitor: "Cloudflare Workers",
      },
      {
        capability: "Editor / deploy",
        hostfunc: "Web editor + CLI, deploy in ~3s",
        competitor: "Wrangler CLI / dashboard",
      },
      {
        capability: "Triggers",
        hostfunc: "HTTP, cron, email, MCP — unified UI",
        competitor: "HTTP, cron, email — via config",
      },
      {
        capability: "Agent / MCP native",
        hostfunc: "Built-in MCP server + scratch functions",
        competitor: "Not built-in",
      },
      {
        capability: "Secrets",
        hostfunc: "Encrypted secrets UI, shared org connectors",
        competitor: "wrangler secret / bindings",
      },
      {
        capability: "Composition + lineage",
        hostfunc: "fn.executeFunction with live lineage",
        competitor: "Service bindings; no lineage view",
      },
      { capability: "Marketplace", hostfunc: "Public, forkable functions", competitor: "None" },
      {
        capability: "Self-host",
        hostfunc: "Yes — on your own CF account",
        competitor: "Cloudflare-managed",
      },
    ],
    whenToPickThem: [
      "You want maximum low-level control over Workers, bindings, Durable Objects, KV, D1, and R2.",
      "You're comfortable managing Wrangler config and dispatch namespaces yourself.",
      "You don't need a managed editor, marketplace, or MCP layer.",
    ],
    whenToPickHostfunc: [
      "You want the speed of Workers without managing Wrangler, bindings, or namespaces.",
      "You want a web editor, encrypted secrets UI, and a forkable marketplace on top.",
      "You want agents to manage your functions over MCP, with composition lineage built in.",
    ],
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return comparisons.find((c) => c.slug === slug);
}
