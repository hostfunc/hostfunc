import assert from "node:assert/strict";
import test from "node:test";
import { emailTriggerConfigSchema, normalizeTriggerConfig } from "./trigger-config.js";

test("http trigger config defaults requireAuth to false", () => {
  const config = normalizeTriggerConfig({ http: {} });
  assert.equal(config.http?.requireAuth, false);
});

test("http trigger config preserves explicit requireAuth=true", () => {
  const config = normalizeTriggerConfig({ http: { requireAuth: true } });
  assert.equal(config.http?.requireAuth, true);
});

test("email trigger config accepts generated {fn}-{org}-{rand}@host addresses", () => {
  const parsed = emailTriggerConfigSchema.parse({
    address: "my-script-acme-corp-abcd2345@hostfunc.io",
  });
  assert.equal(parsed.address, "my-script-acme-corp-abcd2345@hostfunc.io");
  assert.deepEqual(parsed.allowlist, []);
});

test("email trigger config accepts custom-domain addresses", () => {
  const parsed = emailTriggerConfigSchema.parse({
    address: "site-acme-x7q2w3e4@www.example.com",
    allowlist: ["ops@example.com"],
  });
  assert.deepEqual(parsed.allowlist, ["ops@example.com"]);
});
