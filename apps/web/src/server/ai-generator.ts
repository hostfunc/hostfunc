import "server-only";

import { HOSTFUNC_TYPES_DTS } from "@/components/editor/hostfunc-types";
import type { FunctionPackageRecord } from "@/lib/function-packages";
import type { FnAiContextKind } from "@/server/fn-ai-context";
import {
  HOSTFUNC_FILE_SKELETON,
  buildSdkKnowledgeBlock,
} from "@/server/sdk-knowledge";

export interface GeneratorAttachment {
  id: string;
  kind: FnAiContextKind;
  name: string;
  content: string;
  sourceUri?: string | null;
  bytes: number;
}

export interface BuildGeneratorMessagesInput {
  userPrompt: string;
  currentCode: string;
  fnSlug: string;
  packages: FunctionPackageRecord[];
  externalDocsContext?: string;
  attachments?: GeneratorAttachment[];
  /** Hard byte budget for merged attachments (defaults to 60 KB). */
  attachmentsBudgetBytes?: number;
}

const DEFAULT_ATTACHMENTS_BUDGET = 60_000;

function formatAttachmentsBlock(
  attachments: GeneratorAttachment[] | undefined,
  budgetBytes: number,
): string {
  if (!attachments || attachments.length === 0) return "";
  const parts: string[] = [
    "The user attached the following documents to this request. Treat them as authoritative",
    "context that supplements the SDK knowledge above. When attachments describe external APIs,",
    "prefer details from these docs over prior training data.",
    "",
  ];
  let used = 0;
  let truncatedAny = false;
  for (const doc of attachments) {
    const headerLine = `=== Attached doc: ${doc.name} [${doc.kind}${
      doc.sourceUri ? ` @ ${doc.sourceUri}` : ""
    }, ${doc.bytes} bytes] ===`;
    const remaining = Math.max(0, budgetBytes - used);
    if (remaining <= 0) {
      truncatedAny = true;
      parts.push(`(omitting remaining attachments; budget ${budgetBytes} bytes exhausted)`);
      break;
    }
    const body =
      doc.content.length > remaining
        ? `${doc.content.slice(0, remaining)}\n(... truncated to fit budget)`
        : doc.content;
    if (doc.content.length > remaining) truncatedAny = true;
    parts.push(headerLine);
    parts.push(body);
    parts.push("=== end ===");
    parts.push("");
    used += body.length;
  }
  if (!truncatedAny) parts.push("(end of attached documents)");
  return parts.join("\n");
}

export function buildGeneratorMessages(
  input: BuildGeneratorMessagesInput,
): Array<{ role: "system" | "user"; content: string }> {
  const packageList = input.packages
    .map((pkg) => `${pkg.name}@${pkg.version ?? "latest"}`)
    .join(", ");

  const system = [
    "You are a senior TypeScript engineer who writes Hostfunc function code.",
    "You act as a wrapper around the @hostfunc/sdk: every generated file must import from",
    "@hostfunc/sdk (never the legacy @hostfunc/fn alias), and must export an async main(input)",
    "function as the runtime entry point. Email-triggered functions may additionally export",
    "an async email(data) function.",
    "",
    "Output rules:",
    "- Return ONLY valid TypeScript code. No prose, no markdown fences, no commentary.",
    "- Start with imports, then optional helper declarations, then export async function main.",
    "- If the task clearly needs the AI/agent/vector submodules, use @hostfunc/sdk/ai,",
    "  @hostfunc/sdk/agent, or @hostfunc/sdk/vector — still alongside the default @hostfunc/sdk",
    "  import when you reference fn or secret.",
    "- Never hardcode tokens or secret values. Use secret.getRequired for required credentials",
    "  and secret.get for optional ones.",
    "- Never use browser-only APIs (window, document, localStorage). Use Node/Web fetch.",
    "- Prefer small, idempotent implementations that compose via fn.executeFunction.",
    "- When vendor SDKs are required (Discord, Slack, AWS, Stripe, etc.), import them normally",
    "  and load credentials via secret.getRequired.",
    "",
    buildSdkKnowledgeBlock(),
    "",
    "## SDK TypeScript declarations",
    "```ts",
    HOSTFUNC_TYPES_DTS.trim(),
    "```",
    "",
    "## Required file skeleton",
    "```ts",
    HOSTFUNC_FILE_SKELETON,
    "```",
  ].join("\n");

  const budget = input.attachmentsBudgetBytes ?? DEFAULT_ATTACHMENTS_BUDGET;
  const attachmentsBlock = formatAttachmentsBlock(input.attachments, budget);

  const user = [
    `Function slug: ${input.fnSlug}`,
    `Installed packages: ${packageList || "(none)"}`,
    "",
    "User request:",
    input.userPrompt,
    "",
    "Current editor code:",
    input.currentCode || "// empty",
    "",
    attachmentsBlock ? `## Attached documents\n${attachmentsBlock}` : "",
    input.externalDocsContext
      ? `## Live docs lookup (may be partial)\n${input.externalDocsContext}`
      : "",
    "",
    "Produce the complete updated file content now.",
  ]
    .filter((block) => block.length > 0)
    .join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function extractTsCode(text: string): string {
  const fenced = text.match(/```(?:ts|typescript)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return text.trim();
}

export function buildPayloadInferenceMessages(input: {
  fnSlug: string;
  currentCode: string;
}): Array<{ role: "system" | "user"; content: string }> {
  return [
    {
      role: "system",
      content:
        "You generate JSON payload examples for Hostfunc function runs. Return ONLY one JSON object. No markdown, no code fences, no explanations.",
    },
    {
      role: "user",
      content: `Function slug: ${input.fnSlug}\n\nFunction code:\n${input.currentCode}\n\nGenerate a realistic test payload object for the function input.`,
    },
  ];
}

export function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const trimmed = text.trim();
  const firstCurly = trimmed.indexOf("{");
  const lastCurly = trimmed.lastIndexOf("}");
  if (firstCurly >= 0 && lastCurly > firstCurly) {
    return trimmed.slice(firstCurly, lastCurly + 1).trim();
  }
  return trimmed;
}

export function validateGeneratedCode(code: string): {
  ok: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const hasNamedMain = /\bexport\s+(async\s+)?function\s+main\b/.test(code);
  const hasDefaultMain = /\bexport\s+default\s+(async\s+)?function\s+main\b/.test(code);
  if (!hasNamedMain && !hasDefaultMain) {
    reasons.push("missing_main_export");
  }
  if (!code.includes("@hostfunc/sdk")) {
    reasons.push("missing_hostfunc_sdk_import");
  }
  if (/["']@hostfunc\/fn["']/.test(code)) {
    reasons.push("legacy_hostfunc_fn_import");
  }
  if (/localStorage|document\.|window\./.test(code)) {
    reasons.push("browser_only_api_detected");
  }
  return { ok: reasons.length === 0, reasons };
}

export function buildRepairMessages(input: {
  priorCode: string;
  reasons: string[];
}): Array<{ role: "system" | "user"; content: string }> {
  return [
    {
      role: "system",
      content: [
        "Repair the TypeScript function code to satisfy Hostfunc runtime constraints.",
        "Return only the corrected TypeScript code (no prose, no fences).",
        "The file MUST import from @hostfunc/sdk and export an async main function.",
      ].join("\n"),
    },
    {
      role: "user",
      content: `Fix these issues: ${input.reasons.join(", ")}\n\nCode:\n${input.priorCode}`,
    },
  ];
}

const HOSTFUNC_DEFAULT_IMPORT = `import fn, { secret } from "@hostfunc/sdk";`;

/**
 * Deterministic post-processor that guarantees every returned file:
 * - imports the SDK via `@hostfunc/sdk` (never `@hostfunc/fn`);
 * - exports an async `main(input)` entry point.
 *
 * If the model already produced a conforming file, this is a near no-op.
 * Otherwise it rewrites the module specifier and wraps any non-import body
 * into a named main export, preserving top-level helper declarations above it.
 */
export function enforceMainAndSdkImport(rawCode: string): string {
  if (!rawCode.trim()) {
    return `${HOSTFUNC_DEFAULT_IMPORT}\n\nexport async function main(input: unknown) {\n  return { ok: true };\n}\n`;
  }

  const code = rawCode.replace(/(["'])@hostfunc\/fn\1/g, '$1@hostfunc/sdk$1');

  const lines = code.split("\n");
  const importLines: string[] = [];
  const bodyLines: string[] = [];
  let inImportBlock = true;
  for (const line of lines) {
    const trimmed = line.trim();
    if (inImportBlock) {
      if (trimmed.length === 0) {
        importLines.push(line);
        continue;
      }
      if (trimmed.startsWith("import ") || trimmed.startsWith("import{") ||
          trimmed.startsWith("\"use ") || trimmed.startsWith("'use ")) {
        importLines.push(line);
        continue;
      }
      inImportBlock = false;
    }
    bodyLines.push(line);
  }

  let importsText = importLines.join("\n").trim();
  const hasSdkImport = /from\s+["']@hostfunc\/sdk["']/.test(importsText);
  if (!hasSdkImport) {
    importsText = importsText
      ? `${HOSTFUNC_DEFAULT_IMPORT}\n${importsText}`
      : HOSTFUNC_DEFAULT_IMPORT;
  }

  let body = bodyLines.join("\n");

  const hasNamedMain = /\bexport\s+(async\s+)?function\s+main\b/.test(body);
  const hasDefaultMain = /\bexport\s+default\s+(async\s+)?function\s+main\b/.test(body);

  if (hasDefaultMain && !hasNamedMain) {
    body = body.replace(
      /export\s+default\s+(async\s+)?function\s+main\b/,
      "export $1function main",
    );
  } else if (!hasNamedMain && !hasDefaultMain) {
    // Look for any top-level `export default async function <name>` and rename to main.
    const defaultFnNamed = body.match(/export\s+default\s+(async\s+)?function\s+(\w+)\s*\(/);
    if (defaultFnNamed) {
      body = body.replace(
        /export\s+default\s+(async\s+)?function\s+\w+\s*\(/,
        "export $1function main(",
      );
    } else {
      // Fallback: wrap non-import body into a main function.
      const wrapped = [
        "export async function main(input: unknown) {",
        ...body
          .split("\n")
          .map((line) => (line.length > 0 ? `  ${line}` : line)),
        "  return { ok: true };",
        "}",
      ].join("\n");
      body = wrapped;
    }
  }

  return `${importsText.trim()}\n\n${body.trim()}\n`;
}
