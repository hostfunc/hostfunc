export interface MarketingLink {
  label: string;
  href: string;
}

export interface MarketingContent {
  badge: string;
  headline: string;
  subheadline: string;
  primaryCta: MarketingLink;
  secondaryCta: MarketingLink;
  trustItems: string[];
  triggerItems: Array<{ title: string; description: string }>;
  compositionSnippet: string;
  features: Array<{ title: string; description: string }>;
  workflow: Array<{ step: string; detail: string }>;
  pricingNote: string;
  footerLinks: MarketingLink[];
}

export const marketingContent: MarketingContent = {
  badge: "Open source · AGPL-3.0-only",
  headline: "Build tiny TypeScript functions and ship them fast.",
  subheadline:
    "Create in the dashboard, deploy in seconds, trigger over HTTP/cron/email/MCP, and inspect every execution with logs and metrics.",
  primaryCta: { label: "Start building", href: "/login" },
  secondaryCta: { label: "Read docs", href: "/docs" },
  trustItems: [
    "HTTP runtime route: /run/:owner/:slug",
    "Trigger support: HTTP, cron, email, MCP",
    "Execution history + live logs in dashboard",
    "CLI + API token auth + MCP route",
  ],
  triggerItems: [
    { title: "HTTP", description: "Invoke deployed functions over the runtime route." },
    { title: "Cron", description: "Dispatch scheduled jobs through the cron worker and control plane." },
    { title: "Email", description: "Route inbound mail to functions with allowlist support." },
    { title: "MCP", description: "Expose function and execution tools to AI clients via /api/mcp." },
  ],
  compositionSnippet: `import fn from "@hostfunc/fn";

export async function main() {
  const report = await fn.executeFunction("my-org/build-report");
  return fn.executeFunction("my-org/post-to-slack", { report });
}`,
  features: [
    {
      title: "Function editor + deploy",
      description: "Draft, deploy, and version functions from the dashboard with runtime routing.",
    },
    {
      title: "Execution observability",
      description: "Inspect status, latency, trigger kind, errors, and structured logs per execution.",
    },
    {
      title: "Secrets and access control",
      description: "Manage encrypted function secrets and org-scoped token access.",
    },
    {
      title: "Triggers that match real workflows",
      description: "Configure HTTP, cron, email, and MCP trigger metadata from function settings.",
    },
    {
      title: "CLI workflows",
      description: "Use login/init/list/deploy/run/logs/secrets commands against hostfunc APIs.",
    },
    {
      title: "MCP integration",
      description: "Connect compatible clients to tool-call functions and executions with audit logging.",
    },
  ],
  workflow: [
    { step: "1. Create", detail: "Create a function in dashboard and save a draft." },
    { step: "2. Deploy", detail: "Deploy to runtime and get a stable run URL." },
    { step: "3. Observe", detail: "Track executions, logs, and usage alerts in dashboard." },
  ],
  pricingNote:
    "Free and paid plans exist in-product. Team collaboration and deeper billing flows continue to evolve.",
  footerLinks: [
    { label: "Docs", href: "/docs" },
    { label: "GitHub", href: "https://github.com/hostfunc/hostfunc" },
    { label: "Dashboard", href: "/dashboard" },
  ],
};

export function assertMarketingContent(): void {
  const links = [
    marketingContent.primaryCta,
    marketingContent.secondaryCta,
    ...marketingContent.footerLinks,
  ];
  for (const link of links) {
    if (!link.href || link.href.trim() === "#" || link.href.includes("your-username")) {
      throw new Error(`invalid marketing link: ${link.label}`);
    }
  }
}
