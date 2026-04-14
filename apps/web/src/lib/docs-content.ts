export interface DocsSection {
  title: string;
  links: Array<{ name: string; href: string }>;
}

export interface DocsPageContent {
  title: string;
  summary: string;
  highlights: string[];
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
      "Hostfunc provides a dashboard-first control plane for TypeScript functions with HTTP, cron, email, and MCP surfaces.",
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
    summary: "Use the web dashboard or CLI with API tokens to create, deploy, and invoke functions.",
    highlights: [
      "Create a function from `/dashboard/new`.",
      "Deploy from function page and invoke runtime via `/run/:owner/:slug`.",
      "Use organization settings for API tokens and MCP setup.",
    ],
    related: [
      { label: "Function settings", href: "/docs/functions" },
      { label: "Security and tokens", href: "/docs/security" },
    ],
  },
  "/docs/functions": {
    title: "Functions",
    summary: "Functions are stored as drafts and immutable deployed versions with org tenancy boundaries.",
    highlights: [
      "Drafts are user-scoped and saved before deploy.",
      "Deploy creates `fn_version` records and updates current version pointers.",
      "Secrets are encrypted and managed in function settings.",
    ],
    related: [
      { label: "Triggers", href: "/docs/triggers" },
      { label: "Executions", href: "/docs/executions" },
    ],
  },
  "/docs/triggers": {
    title: "Triggers",
    summary: "Trigger configuration supports HTTP, cron, email, and MCP kinds with one trigger per kind per function.",
    highlights: [
      "HTTP trigger is always available through runtime route.",
      "Cron and email trigger dispatch workers are implemented with control-plane endpoints.",
      "Trigger kind is propagated into execution start metadata.",
    ],
    related: [
      { label: "Executions", href: "/docs/executions" },
      { label: "MCP", href: "/docs/mcp" },
    ],
  },
  "/docs/executions": {
    title: "Executions and Logs",
    summary: "Execution list, details, metrics, and log streaming are available in dashboard and API.",
    highlights: [
      "List/filter executions by status, trigger kind, and date range.",
      "Execution details include metrics and error context.",
      "Live logs stream via SSE endpoint for execution detail views.",
    ],
    related: [
      { label: "Triggers", href: "/docs/triggers" },
      { label: "CLI logs", href: "/docs/cli" },
    ],
  },
  "/docs/security": {
    title: "Security and Access",
    summary: "Org session auth, API token auth, and internal bearer-token control-plane auth are split by boundary.",
    highlights: [
      "Dashboard actions require active org session.",
      "External automation uses API tokens and org-scoped route checks.",
      "Internal runtime/control routes require shared bearer tokens.",
    ],
    related: [
      { label: "CLI", href: "/docs/cli" },
      { label: "MCP", href: "/docs/mcp" },
    ],
  },
  "/docs/cli": {
    title: "CLI",
    summary:
      "Public npm package `@host-func/cli` supports login, init, list, deploy, run, logs, and secrets set flows.",
    highlights: [
      "CLI authenticates with API token and base URL config.",
      "Deploy/run/logs/secrets map to `/api/cli/*` routes.",
      "CLI reads project config from `hostfunc.json` and user credentials from `~/.hostfunc`.",
      "Supported runtime is Node.js >=22 and CLI telemetry is disabled.",
    ],
    related: [
      { label: "Security", href: "/docs/security" },
      { label: "Executions", href: "/docs/executions" },
    ],
  },
  "/docs/mcp": {
    title: "MCP",
    summary: "MCP endpoint is available at `/api/mcp` with API-token auth, rate limiting, and tool-call audit logging.",
    highlights: [
      "Supported tools include functions and executions operations.",
      "Origin allowlist and per-token rate limiting are enforced.",
      "Dashboard includes token management and MCP install guidance.",
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
