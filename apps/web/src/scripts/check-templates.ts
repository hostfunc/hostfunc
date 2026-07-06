/**
 * Structural validation for the function-creation templates.
 *
 * The `code` string of each template ships verbatim into a user's new
 * function, so a typo here silently produces an unusable starter. TypeScript
 * can't catch it — the code is a string, not compiled. This script asserts
 * the invariants instead: unique kebab-case ids, a known category, the right
 * exported entry point, an SDK import wherever the SDK is used, declared
 * secrets that are actually read via `secret.getRequired`, and a cron
 * schedule present iff the trigger is a cron. Finally, every template is run
 * through the real deploy bundler, which proves its imports resolve and the
 * output fits the platform size limits.
 *
 * Run: pnpm --filter @hostfunc/web templates:check
 */
import { BundleError, bundleFunction } from "@hostfunc/executor-cloudflare";
import { FUNCTION_TEMPLATES, type TemplateCategory } from "../lib/templates";

const CATEGORIES: readonly TemplateCategory[] = [
  "utilities",
  "ai",
  "data",
  "storage",
  "integrations",
  "notifications",
  "webhooks",
  "automation",
];

const failures: string[] = [];
const seenIds = new Set<string>();

for (const template of FUNCTION_TEMPLATES) {
  const fail = (message: string) => failures.push(`[${template.id || "?"}] ${message}`);

  if (!/^[a-z0-9-]+$/.test(template.id)) {
    fail("id must be non-empty kebab-case");
  }
  if (seenIds.has(template.id)) {
    fail("duplicate id");
  }
  seenIds.add(template.id);

  if (!CATEGORIES.includes(template.category)) {
    fail(`unknown category "${template.category}"`);
  }
  if (!template.name.trim()) fail("name is empty");
  if (!template.description.trim()) fail("description is empty");
  if (!template.icon.trim()) fail("icon is empty");
  if (!template.accentClass.includes("text-")) fail("accentClass looks malformed");

  const code = template.code;
  const exportsMain = /export\s+async\s+function\s+main\s*\(/.test(code);
  const exportsEmail = /export\s+async\s+function\s+email\s*\(/.test(code);
  if (!exportsMain && !exportsEmail) {
    fail("code must export an async main() (or email()) function");
  }

  const usesSdk = /\bfn\b/.test(code) || /\bsecret\b/.test(code);
  if (usesSdk && !code.includes('from "@hostfunc/sdk"')) {
    fail("code references fn/secret but never imports from @hostfunc/sdk");
  }

  if (/\bkv\./.test(code) && !code.includes('from "@hostfunc/sdk/kv"')) {
    fail("code references kv but never imports from @hostfunc/sdk/kv");
  }

  for (const key of template.requiredSecrets) {
    if (!code.includes(`getRequired("${key}")`)) {
      fail(`requiredSecrets lists ${key}, but it is not read via secret.getRequired`);
    }
  }

  const { kind, schedule, hint } = template.trigger;
  if (kind === "cron" && !schedule) {
    fail("cron trigger must declare a schedule");
  }
  if (kind !== "cron" && schedule) {
    fail("only cron triggers may declare a schedule");
  }
  if (!hint.trim()) fail("trigger.hint is empty");

  const assetPaths = new Set<string>();
  for (const asset of template.assets ?? []) {
    if (!asset.path.trim()) fail("attached asset has an empty path");
    if (assetPaths.has(asset.path)) fail(`duplicate attached asset path ${asset.path}`);
    assetPaths.add(asset.path);
    if (!asset.mime.trim()) fail(`attached asset ${asset.path} has an empty mime`);
    if (!asset.content.trim()) fail(`attached asset ${asset.path} has empty content`);
  }
}

// Run each template through the real deploy bundler. This catches unresolvable
// imports (e.g. a driver missing from apps/web dependencies) and size overruns
// that the structural checks above can't see.
for (const template of FUNCTION_TEMPLATES) {
  try {
    await bundleFunction({
      code: template.code,
      fnId: `template-${template.id}`,
      versionId: "check",
      assets: (template.assets ?? []).map((asset) => ({
        path: asset.path,
        mime: asset.mime,
        content: Buffer.from(asset.content, "utf8"),
      })),
    });
  } catch (error) {
    const detail =
      error instanceof BundleError || error instanceof Error ? error.message : String(error);
    failures.push(`[${template.id}] failed to bundle: ${detail}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`✗ ${failures.length} template issue(s):\n`);
  for (const failure of failures) {
    process.stderr.write(`  - ${failure}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `✓ ${FUNCTION_TEMPLATES.length} templates passed structural and bundle checks.\n`,
);
