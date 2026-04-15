export interface MarketingLink {
  label: string;
  href: string;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  tool?: {
    name: string;
    args: Record<string, unknown>;
    output: string;
  };
}

export interface LineageNodeSeed {
  id: string;
  label: string;
  scratch?: boolean;
  /** 0..1 — how prominent the node is (drives size and glow) */
  weight: number;
}

export interface LineageEdgeSeed {
  source: string;
  target: string;
  /** 0..1 — drives stroke width */
  weight: number;
}

export interface MarketingContent {
  badge: string;
  headlineLead: string;
  headlineEmphasis: string;
  headlineTail: string;
  subheadline: string;
  primaryCta: MarketingLink;
  secondaryCta: MarketingLink;
  navLinks: MarketingLink[];
  trustItems: string[];

  /** Hero animated editor — typed character by character */
  heroEditor: {
    filename: string;
    code: string;
  };

  /** "The agent-native pitch" section */
  agentPitch: {
    eyebrow: string;
    headline: string;
    body: string;
    pillars: Array<{ title: string; body: string }>;
    conversation: AgentMessage[];
    lineage: {
      nodes: LineageNodeSeed[];
      edges: LineageEdgeSeed[];
    };
  };

  /** Trigger types section */
  triggers: Array<{
    id: "http" | "cron" | "email" | "mcp";
    title: string;
    tagline: string;
    body: string;
    snippet: string;
  }>;

  /** Composition demo */
  composition: {
    eyebrow: string;
    headline: string;
    body: string;
    snippet: string;
    lineage: {
      nodes: LineageNodeSeed[];
      edges: LineageEdgeSeed[];
    };
  };

  /** CLI showcase */
  cli: {
    eyebrow: string;
    headline: string;
    body: string;
    sequence: Array<{ command: string; output: string[]; delayMs?: number }>;
  };

  /** Connectors section */
  connectors: Array<{
    name: string;
    slug: string;
    available: boolean;
    description: string;
  }>;

  /** Templates marquee */
  templates: Array<{
    name: string;
    icon: string;
    category: string;
    description: string;
  }>;

  /** Architecture / how it works */
  architecture: {
    eyebrow: string;
    headline: string;
    body: string;
    stages: Array<{ id: string; label: string; detail: string }>;
  };

  /** Feature grid */
  features: Array<{
    title: string;
    body: string;
    /** Lucide icon name */
    icon: string;
  }>;

  /** Open source / community */
  community: {
    eyebrow: string;
    headline: string;
    body: string;
    facts: Array<{ label: string; value: string }>;
  };

  /** Big closer CTA */
  closer: {
    headline: string;
    body: string;
  };

  footerLinks: MarketingLink[];
  footerNote: string;
}

export const marketingContent: MarketingContent = {
  badge: "v0.1 alpha · Open source · AGPL-3.0",

  headlineLead: "Tiny functions,",
  headlineEmphasis: "composed by anyone",
  headlineTail: "— including the agents in your stack.",

  subheadline:
    "hostfunc is a TypeScript function platform built for the post-LLM era. Deploy from your editor, your CLI, or directly from a Claude conversation. Compose functions into systems. Watch the lineage graph fill in live.",

  primaryCta: { label: "Start building", href: "/login" },
  secondaryCta: { label: "Read docs", href: "/docs" },

  navLinks: [
    { label: "Docs", href: "/docs" },
    { label: "Templates", href: "/templates" },
    { label: "Connectors", href: "/connectors" },
    { label: "GitHub", href: "https://github.com/hostfunc/hostfunc" },
  ],

  trustItems: [
    "Cloudflare Workers runtime",
    "MCP-native",
    "AGPL-3.0",
    "TypeScript-first",
    "Self-hostable",
  ],

  heroEditor: {
    filename: "weather-digest.ts",
    code: `import fn, { secret } from "@hostfunc/fn";

export async function main(input: { city: string }) {
  const apiKey = await secret.getRequired("WEATHER_API_KEY");

  const data = await fetch(
    \`https://api.weather.gov/points/\${input.city}\`,
    { headers: { "x-api-key": apiKey } },
  ).then((r) => r.json());

  const summary = await fn.executeFunction(
    "you/ai-summarize",
    { text: data.forecast },
  );

  return { city: input.city, summary };
}`,
  },

  agentPitch: {
    eyebrow: "Agent-native",
    headline: "The first function platform built for agents.",
    body: "Connect Claude (or any MCP client) to your hostfunc org. The LLM can list, read, write, run, and debug functions as tools. It can even create scratch functions that auto-delete after a TTL — perfect for one-off computations that shouldn't pollute your namespace.",
    pillars: [
      {
        title: "MCP server, not bolt-on",
        body: "The same handlers the dashboard uses. No glue layer, no impedance mismatch.",
      },
      {
        title: "Ephemeral scratch functions",
        body: "create_scratch_function returns a result and self-destructs on a TTL. The feature nobody else has.",
      },
      {
        title: "Live lineage tracking",
        body: "Every fn.executeFunction call is recorded. Watch agents compose your graph in real time.",
      },
    ],
    conversation: [
      {
        role: "user",
        content:
          "Fetch the top 3 stories from Hacker News and tell me which one mentions AI most.",
      },
      {
        role: "assistant",
        content: "I'll create a scratch function for this.",
        tool: {
          name: "create_scratch_function",
          args: { ttlSeconds: 300 },
          output:
            '{ "slug": "you/scratch-9k2x", "executionId": "exe_01J…", "wallMs": 412 }',
        },
      },
      {
        role: "assistant",
        content:
          'The top story right now is "Anthropic releases Claude 4.5" with 8 mentions of AI. The function will auto-delete in 5 minutes.',
      },
    ],
    lineage: {
      nodes: [
        { id: "user", label: "claude", weight: 1 },
        { id: "scratch", label: "scratch-9k2x", scratch: true, weight: 0.9 },
        { id: "hn", label: "hn-top", weight: 0.6 },
        { id: "ai", label: "ai-summarize", weight: 0.7 },
      ],
      edges: [
        { source: "user", target: "scratch", weight: 1 },
        { source: "scratch", target: "hn", weight: 0.5 },
        { source: "scratch", target: "ai", weight: 0.5 },
      ],
    },
  },

  triggers: [
    {
      id: "http",
      title: "HTTP",
      tagline: "Public URL per function.",
      body: "Every deployed function gets a stable run URL. Call it with curl, wire it to a webhook, route it through your CDN.",
      snippet: `curl -X POST https://you.run/run/you/process \\
  -H "content-type: application/json" \\
  -d '{"event":"order.created"}'`,
    },
    {
      id: "cron",
      title: "Cron",
      tagline: "Standard 5-field expressions.",
      body: "The cron worker fires every minute, reads enabled triggers from Postgres, and dispatches via the same path as HTTP. Unified observability, no separate runtime.",
      snippet: `// In the Triggers tab:
//   schedule: "*/5 * * * *"
//   timezone: "Europe/London"

export async function main() {
  return await checkUptime("https://you.dev");
}`,
    },
    {
      id: "email",
      title: "Email",
      tagline: "Cloudflare Email Routing.",
      body: "Inbound mail to alias@mail.you.dev triggers the function. Allowlist senders, parse headers, ship the body to S3 — all in 20 lines.",
      snippet: `export async function main(email: {
  from: string;
  to: string;
  subject: string;
}) {
  if (!email.subject.includes("[urgent]")) return;
  await notify(email.from, email.subject);
}`,
    },
    {
      id: "mcp",
      title: "MCP",
      tagline: "Tool calls from any LLM.",
      body: "Generate an API token, paste it into Claude Desktop's config, done. The LLM has 9 tools for managing your functions, all rate-limited and audited.",
      snippet: `// claude_desktop_config.json
{
  "mcpServers": {
    "hostfunc": {
      "url": "https://you.run/api/mcp",
      "headers": { "Authorization": "Bearer ofn_live_…" }
    }
  }
}`,
    },
  ],

  composition: {
    eyebrow: "Composition",
    headline: "Functions calling functions, with lineage you can see.",
    body: "fn.executeFunction is a first-class primitive — depth-tracked, cycle-detected, and recorded in the execution graph. The lineage view reads parent_execution_id and renders edges weighted by call volume, colored by error rate.",
    snippet: `import fn from "@hostfunc/fn";

export async function main(input: { url: string }) {
  // Fetch and parse the page metadata
  const meta = await fn.executeFunction(
    "you/url-metadata",
    { url: input.url },
  );

  // Summarize the description with Claude
  const summary = await fn.executeFunction(
    "you/ai-summarize",
    { text: meta.description },
  );

  // Notify Slack — uses GITHUB_TOKEN from a connector
  await fn.executeFunction(
    "you/slack-notify",
    { channel: "#feed", text: summary },
  );

  return { meta, summary };
}`,
    lineage: {
      nodes: [
        { id: "main", label: "share-link", weight: 1 },
        { id: "meta", label: "url-metadata", weight: 0.7 },
        { id: "ai", label: "ai-summarize", weight: 0.85 },
        { id: "slack", label: "slack-notify", weight: 0.5 },
        { id: "fetch", label: "url-fetch", weight: 0.4 },
      ],
      edges: [
        { source: "main", target: "meta", weight: 1 },
        { source: "main", target: "ai", weight: 1 },
        { source: "main", target: "slack", weight: 0.6 },
        { source: "meta", target: "fetch", weight: 0.3 },
      ],
    },
  },

  cli: {
    eyebrow: "Terminal-first",
    headline: "Deploy from where you already work.",
    body: "The `hostfunc` CLI is an MCP client. Same auth, same rate limits, same audit trail. Init a project, deploy, run, tail logs — all from your shell.",
    sequence: [
      {
        command: "hostfunc login",
        output: ["? API token: ********************", "✓ Logged in as you@dev"],
      },
      {
        command: "hostfunc init",
        output: ["? Function slug: weather-digest", "✓ Created hostfunc.json", "✓ Created fn.ts"],
      },
      {
        command: "hostfunc deploy",
        output: [
          "Deploying weather-digest…",
          "✓ Bundled (12 KB)",
          "✓ Uploaded to dispatch namespace",
          "✓ Live at https://you.run/run/you/weather-digest",
        ],
      },
      {
        command: 'hostfunc run weather-digest --input \'{"city":"London"}\'',
        output: [
          "Execution exe_01J… · 412ms",
          '{ "city": "London", "summary": "Mild, partly cloudy…" }',
        ],
      },
    ],
  },

  connectors: [
    {
      name: "GitHub",
      slug: "github",
      available: true,
      description: "Read repos, issues, PRs.",
    },
    { name: "Gmail", slug: "gmail", available: false, description: "Coming soon." },
    { name: "Slack", slug: "slack", available: false, description: "Coming soon." },
    { name: "Linear", slug: "linear", available: false, description: "Coming soon." },
    { name: "Notion", slug: "notion", available: false, description: "Coming soon." },
    { name: "Stripe", slug: "stripe", available: false, description: "Coming soon." },
  ],

  templates: [
    {
      name: "Hacker News digest",
      icon: "📰",
      category: "data",
      description: "Top 10 stories, daily.",
    },
    {
      name: "GitHub profile lookup",
      icon: "🐙",
      category: "integrations",
      description: "Profile + repos for any user.",
    },
    {
      name: "URL metadata extractor",
      icon: "🔗",
      category: "utilities",
      description: "Title, OG tags, og:image.",
    },
    {
      name: "Webhook logger",
      icon: "📥",
      category: "utilities",
      description: "Catch + log any POST.",
    },
    {
      name: "AI text summarizer",
      icon: "🤖",
      category: "ai",
      description: "Summarize via Claude.",
    },
    {
      name: "Uptime monitor",
      icon: "📡",
      category: "notifications",
      description: "Ping a URL, alert on fail.",
    },
    {
      name: "JSON transformer",
      icon: "🔧",
      category: "utilities",
      description: "Reshape via composition.",
    },
    {
      name: "Hello world",
      icon: "👋",
      category: "utilities",
      description: "The starter.",
    },
  ],

  architecture: {
    eyebrow: "Built for scale",
    headline: "One control plane. Six edge workers. Zero ops.",
    body: "Your dashboard, MCP server, and metadata live in a Next.js control plane. User functions run as isolated V8 scripts inside a Cloudflare Workers for Platforms dispatch namespace. Every fetch from user code passes through an outbound worker that filters SSRF and counts egress. Logs ship via tail worker to Postgres in <2s.",
    stages: [
      { id: "request", label: "Request", detail: "POST /run/you/fn arrives at the edge." },
      { id: "dispatch", label: "Dispatch", detail: "Lookup cached in KV; signed exec token issued." },
      { id: "user", label: "User script", detail: "Runs in isolated V8 with per-script CPU + memory caps." },
      { id: "outbound", label: "Outbound", detail: "Every fetch SSRF-filtered and byte-counted." },
      { id: "tail", label: "Tail", detail: "Logs and metrics shipped to Postgres in real time." },
    ],
  },

  features: [
    {
      title: "Web editor with live deploy",
      body: "Monaco-based, full TypeScript support, deploy in ~3 seconds with one click.",
      icon: "code",
    },
    {
      title: "Encrypted secrets",
      body: "AES-256-GCM at rest. Fetched at execution time over a signed callback. Never in bindings.",
      icon: "lock",
    },
    {
      title: "Live log streaming",
      body: "SSE-backed log panel that updates as your function runs. No refresh needed.",
      icon: "activity",
    },
    {
      title: "OAuth connectors",
      body: "Click 'Connect GitHub'. Token stored as an org secret. Any function in the org can use it.",
      icon: "plug-zap",
    },
    {
      title: "Cron + email triggers",
      body: "5-field cron expressions. Cloudflare Email Routing for inbound mail. Both unified through one observability pipeline.",
      icon: "calendar-clock",
    },
    {
      title: "Lineage graph",
      body: "Every fn-to-fn call recorded. React Flow visualization with edge weights and error coloring.",
      icon: "git-branch",
    },
    {
      title: "Template gallery",
      body: "Curated starting points: HN digest, uptime monitor, AI summarizer, GitHub lookup, more.",
      icon: "library",
    },
    {
      title: "Per-execution metrics",
      body: "CPU, wall, memory, egress, subrequests — captured for every invocation.",
      icon: "gauge",
    },
    {
      title: "Self-hostable",
      body: "git clone && docker compose up. Bring your own Cloudflare account.",
      icon: "server",
    },
  ],

  community: {
    eyebrow: "Open source",
    headline: "AGPL-3.0. Yours to fork.",
    body: "If you're running it for yourself, AGPL asks nothing. If you're running a hosted version that competes with us, AGPL asks you to publish your changes. Fair trade.",
    facts: [
      { label: "License", value: "AGPL-3.0" },
      { label: "Stack", value: "TypeScript / Next.js 16 / Cloudflare" },
      { label: "Status", value: "Alpha" },
      { label: "Self-host", value: "Docker Compose" },
    ],
  },

  closer: {
    headline: "Ship your first function in 90 seconds.",
    body: "Sign in, drop in some TypeScript, hit deploy. The URL is live before you've finished reading this paragraph.",
  },

  footerLinks: [
    { label: "Docs", href: "/docs" },
    { label: "Templates", href: "/templates" },
    { label: "GitHub", href: "https://github.com/hostfunc/hostfunc" },
    { label: "Discord", href: "https://discord.gg/hostfunc" },
    { label: "Security", href: "/security" },
    { label: "Changelog", href: "/changelog" },
  ],

  footerNote:
    "hostfunc is alpha software. The public API is not stable yet. Expect breakage; we'll fix it.",
};

export function assertMarketingContent(): void {
  const links = [
    marketingContent.primaryCta,
    marketingContent.secondaryCta,
    ...marketingContent.navLinks,
    ...marketingContent.footerLinks,
  ];
  for (const link of links) {
    if (!link.href || link.href.trim() === "#" || link.href.includes("your-username")) {
      throw new Error(`invalid marketing link: ${link.label}`);
    }
  }
}