import "server-only";

import { HOSTFUNC_TYPES_DTS } from "@/components/editor/hostfunc-types";
import { getDocsPage } from "@/lib/docs-content";
import type { FunctionPackageRecord } from "@/lib/function-packages";

export function buildGeneratorMessages(input: {
  userPrompt: string;
  currentCode: string;
  fnSlug: string;
  packages: FunctionPackageRecord[];
  externalDocsContext?: string;
}): Array<{ role: "system" | "user"; content: string }> {
  const sdkOverview = getDocsPage("/docs/sdk");
  const sdkAi = getDocsPage("/docs/sdk/ai");
  const sdkAgent = getDocsPage("/docs/sdk/agent");
  const sdkVector = getDocsPage("/docs/sdk/vector");
  const packageList = input.packages.map((pkg) => `${pkg.name}@${pkg.version ?? "latest"}`).join(", ");

  const system = `
You are a senior TypeScript engineer generating Hostfunc function code.
Return ONLY valid TypeScript code with no markdown fences.
Use @hostfunc/sdk imports (never @hostfunc/fn).
The file must export a main function (named export preferred).
Preserve runtime safety and clear error handling.
If AI, agent, or vector APIs are relevant, use @hostfunc/sdk/ai, @hostfunc/sdk/agent, @hostfunc/sdk/vector.
Prefer Hostfunc composition patterns (fn.executeFunction, secret.get/getRequired) first.
Balanced mode: when vendor SDKs are required (Discord/Slack/AWS/etc), include them with typed helpers and clear secret usage.
Never hardcode secrets/tokens. Use secret.getRequired for required credentials.
  `.trim();

  const user = `
Function slug: ${input.fnSlug}
Installed packages: ${packageList || "(none)"}

User request:
${input.userPrompt}

Current editor code:
${input.currentCode || "// empty"}

SDK Type Declarations:
${HOSTFUNC_TYPES_DTS}

SDK docs (overview highlights):
${(sdkOverview.highlights ?? []).join("\n")}

SDK docs (AI highlights):
${(sdkAi.highlights ?? []).join("\n")}

SDK docs (Agent highlights):
${(sdkAgent.highlights ?? []).join("\n")}

SDK docs (Vector highlights):
${(sdkVector.highlights ?? []).join("\n")}

Canonical Hostfunc examples:
- import fn, { secret } from "@hostfunc/sdk"
- const token = await secret.getRequired("DISCORD_BOT_TOKEN")
- const result = await fn.executeFunction("org/target-fn", { data: "value" })

${input.externalDocsContext ? `External docs context (optional, may be partial):\n${input.externalDocsContext}` : ""}
  `.trim();

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
  if (!/\bexport\s+(async\s+)?function\s+main\b/.test(code) && !/\bexport\s+default\s+(async\s+)?function\s+main\b/.test(code)) {
    reasons.push("missing_main_export");
  }
  if (!code.includes("@hostfunc/sdk")) {
    reasons.push("missing_hostfunc_sdk_import");
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
      content:
        "Repair the TypeScript function code to satisfy Hostfunc runtime constraints. Return only code.",
    },
    {
      role: "user",
      content: `Fix these issues: ${input.reasons.join(", ")}\n\nCode:\n${input.priorCode}`,
    },
  ];
}
