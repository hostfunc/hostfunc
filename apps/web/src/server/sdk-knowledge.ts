import "server-only";

import { type DocsPageContent, getDocsPage } from "@/lib/docs-content";

const SDK_PAGES: Array<{ path: string; label: string }> = [
  { path: "/docs/sdk", label: "@hostfunc/sdk (core)" },
  { path: "/docs/sdk/ai", label: "@hostfunc/sdk/ai" },
  { path: "/docs/sdk/agent", label: "@hostfunc/sdk/agent" },
  { path: "/docs/sdk/vector", label: "@hostfunc/sdk/vector" },
];

export const HOSTFUNC_FILE_SKELETON = `import fn, { secret } from "@hostfunc/sdk";
// Optional: import { askAi } from "@hostfunc/sdk/ai";
// Optional: import { runAgent } from "@hostfunc/sdk/agent";
// Optional: import { upsert, query } from "@hostfunc/sdk/vector";

export async function main(input: unknown) {
  // Your implementation goes here.
  return { ok: true };
}`;

function formatApiReference(entries: DocsPageContent["sdkGuide"]): string {
  if (!entries || entries.apiReference.length === 0) return "";
  const parts: string[] = [];
  for (const entry of entries.apiReference) {
    const lines: string[] = [];
    lines.push(`### ${entry.name}`);
    lines.push(`Signature: \`${entry.signature}\``);
    if (entry.description) lines.push(entry.description);
    if (entry.args && entry.args.length > 0) {
      lines.push("Args:");
      for (const arg of entry.args) {
        const req = arg.required ? "required" : "optional";
        lines.push(`- \`${arg.name}\` (${arg.type}, ${req}): ${arg.description}`);
      }
    }
    if (entry.returns) lines.push(`Returns: ${entry.returns}`);
    if (entry.throws && entry.throws.length > 0) {
      lines.push("Throws:");
      for (const t of entry.throws) lines.push(`- ${t}`);
    }
    if (entry.notes && entry.notes.length > 0) {
      lines.push("Notes:");
      for (const n of entry.notes) lines.push(`- ${n}`);
    }
    parts.push(lines.join("\n"));
  }
  return parts.join("\n\n");
}

function formatCodeExamples(entries: DocsPageContent["sdkGuide"]): string {
  if (!entries?.codeExamples || entries.codeExamples.length === 0) return "";
  const parts: string[] = [];
  for (const example of entries.codeExamples) {
    parts.push(
      [`### ${example.title}`, example.description, "```ts", example.code, "```"].join("\n"),
    );
  }
  return parts.join("\n\n");
}

function formatBestPractices(entries: DocsPageContent["sdkGuide"]): string {
  if (!entries?.bestPractices || entries.bestPractices.length === 0) return "";
  return entries.bestPractices.map((bp) => `- ${bp}`).join("\n");
}

/**
 * Build a compact, model-friendly knowledge block that fully describes the
 * Hostfunc SDK surface: default exports, submodule APIs, signatures, args,
 * throws, examples, and best-practices. Safe to cache across requests.
 */
export function buildSdkKnowledgeBlock(): string {
  const sections: string[] = [];

  sections.push(
    [
      "# Hostfunc SDK knowledge",
      "",
      "Hostfunc functions run on a serverless runtime. The `@hostfunc/sdk` package is the",
      "only way to interact with the platform from inside a function. Every generated file",
      "must import from `@hostfunc/sdk` (never `@hostfunc/fn`, which is a deprecated alias)",
      "and must export an async `main(input)` function as the entry point.",
    ].join("\n"),
  );

  sections.push(
    [
      "## Canonical file skeleton",
      "```ts",
      HOSTFUNC_FILE_SKELETON,
      "```",
      "",
      "Runtime contract:",
      "- HTTP/cron/MCP triggers invoke `main(input)` with the parsed JSON body (or query params for GET).",
      "- Email triggers may additionally export `email(data)`.",
      "- The return value of `main` is serialized as the HTTP response body.",
      "- Throw to signal errors; uncaught errors are recorded as `fn_error` executions.",
      "- Never use browser-only APIs (`window`, `document`, `localStorage`). Use Node-style fetch + SDK helpers.",
      "- Never hardcode credentials. Load them via `secret.getRequired(KEY)` and configure KEY in function Settings → Secrets.",
    ].join("\n"),
  );

  for (const { path, label } of SDK_PAGES) {
    const page = getDocsPage(path);
    const guide = page.sdkGuide;
    const blocks: string[] = [`## ${label}`, page.summary];
    if (guide?.quickstart) blocks.push(`Quickstart: ${guide.quickstart}`);
    const api = formatApiReference(guide);
    if (api) blocks.push(`### API reference\n\n${api}`);
    const examples = formatCodeExamples(guide);
    if (examples) blocks.push(`### Examples\n\n${examples}`);
    const best = formatBestPractices(guide);
    if (best) blocks.push(`### Best practices\n\n${best}`);
    sections.push(blocks.join("\n\n"));
  }

  sections.push(
    [
      "## Composition rules",
      '- Chain functions with `await fn.executeFunction("orgSlug/fnSlug", payload)`.',
      '- Read required credentials with `await secret.getRequired("KEY")`; optional ones with `await secret.get("KEY")`.',
      '- Emit structured logs with `fn.log("info", message, fields)`; they appear in execution logs.',
      "- When vendor SDKs are required (Discord, Slack, AWS, Stripe, OpenAI, etc.), import them normally — the packages list is managed by the editor and deploy pipeline.",
      "- Prefer small, idempotent functions composed with `fn.executeFunction` over single monolithic handlers.",
    ].join("\n"),
  );

  return sections.join("\n\n");
}
