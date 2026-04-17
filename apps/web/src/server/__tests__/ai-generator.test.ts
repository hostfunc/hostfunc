import assert from "node:assert/strict";
import test from "node:test";
import { buildGeneratorMessages, extractJsonObject, validateGeneratedCode } from "../ai-generator";
import { fetchExternalDocsContext } from "../ai-docs";

test("buildGeneratorMessages includes hostfunc sdk guidance", () => {
  const messages = buildGeneratorMessages({
    userPrompt: "create function",
    currentCode: "export async function main() { return { ok: true }; }",
    fnSlug: "my-fn",
    packages: [{ name: "@hostfunc/sdk", source: "default", version: "0.1.0", updatedAt: new Date().toISOString() }],
    externalDocsContext: "",
  });

  const combined = messages.map((m) => m.content).join("\n");
  assert.ok(combined.includes("@hostfunc/sdk"));
  assert.ok(combined.includes("secret.getRequired"));
});

test("validateGeneratedCode flags missing main export", () => {
  const result = validateGeneratedCode("const x = 1;");
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes("missing_main_export"));
});

test("fetchExternalDocsContext ignores non-allowlisted hosts", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("<html>docs</html>", { status: 200 });
  }) as typeof fetch;
  try {
    const text = await fetchExternalDocsContext({
      query: "discord bot",
      hints: ["evil.com"],
    });
    assert.equal(text, "");
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("extractJsonObject returns fenced JSON body", () => {
  const extracted = extractJsonObject("```json\n{\n  \"name\": \"demo\"\n}\n```");
  assert.equal(extracted, '{\n  "name": "demo"\n}');
});

