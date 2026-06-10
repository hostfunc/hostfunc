import assert from "node:assert/strict";
import test from "node:test";
import { domainInputSchema } from "../../lib/custom-domain-hostname";

function parseHostname(hostname: string) {
  return domainInputSchema.safeParse({ hostname, fnId: "fn_1" });
}

test("accepts a normal subdomain", () => {
  assert.equal(parseHostname("www.example.com").success, true);
  assert.equal(parseHostname("deep.sub.example.co.uk").success, true);
});

test("lowercases and trims input", () => {
  const parsed = parseHostname("  WWW.Example.COM  ");
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.hostname, "www.example.com");
});

test("rejects punycode (xn--) labels", () => {
  assert.equal(parseHostname("xn--e1awd7f.com").success, false);
  assert.equal(parseHostname("www.xn--80ak6aa92e.com").success, false);
});

test("rejects reserved hostfunc suffixes", () => {
  assert.equal(parseHostname("hostfunc.io").success, false);
  assert.equal(parseHostname("api.hostfunc.io").success, false);
  assert.equal(parseHostname("evil.hostfunc.app").success, false);
  assert.equal(parseHostname("x.hostfunc.dev").success, false);
});

test("does not reject lookalike suffixes of reserved domains", () => {
  assert.equal(parseHostname("nothostfunc.io").success, true);
});

test("rejects malformed hostnames", () => {
  assert.equal(parseHostname("http://example.com").success, false);
  assert.equal(parseHostname("example.com/path").success, false);
  assert.equal(parseHostname("example.com.").success, false);
  assert.equal(parseHostname("localhost").success, false);
  assert.equal(parseHostname("-bad.example.com").success, false);
  assert.equal(parseHostname("*.example.com").success, false);
  assert.equal(parseHostname(`${"a".repeat(64)}.example.com`).success, false);
});
