import assert from "node:assert/strict";
import test from "node:test";
import { isReservedWorkspaceSlug, workspaceSlugSchema } from "../../lib/workspace-slug";

function parse(slug: string) {
  return workspaceSlugSchema.safeParse(slug);
}

test("accepts a normal workspace slug", () => {
  assert.equal(parse("acme").success, true);
  assert.equal(parse("acme-labs").success, true);
  assert.equal(parse("team42").success, true);
});

test("trims and lowercases", () => {
  const parsed = parse("  Acme-Labs  ");
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data, "acme-labs");
});

test("rejects too-short slugs", () => {
  assert.equal(parse("ab").success, false);
});

test("rejects slugs over 63 characters", () => {
  assert.equal(parse("a".repeat(64)).success, false);
  assert.equal(parse("a".repeat(63)).success, true);
});

test("rejects weird characters", () => {
  assert.equal(parse("acme corp").success, false);
  assert.equal(parse("acme_corp").success, false);
  assert.equal(parse("acme.corp").success, false);
  assert.equal(parse("acmé").success, false);
  assert.equal(parse("acme!").success, false);
});

test("rejects leading or trailing hyphens", () => {
  assert.equal(parse("-acme").success, false);
  assert.equal(parse("acme-").success, false);
});

test("rejects punycode prefixes", () => {
  assert.equal(parse("xn--acme").success, false);
});

test("rejects reserved subdomains", () => {
  for (const reserved of ["api", "www", "mail", "admin", "run", "dashboard", "hostfunc"]) {
    assert.equal(parse(reserved).success, false, `expected ${reserved} to be rejected`);
  }
});

test("isReservedWorkspaceSlug is case- and whitespace-insensitive", () => {
  assert.equal(isReservedWorkspaceSlug("API"), true);
  assert.equal(isReservedWorkspaceSlug("  Mail "), true);
  assert.equal(isReservedWorkspaceSlug("acme"), false);
});
