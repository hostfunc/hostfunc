import assert from "node:assert/strict";
import test from "node:test";
import { matchesAllowlist, toEmailTriggerRuntimeBody } from "../../lib/inbound-email-shared";

test("matchesAllowlist accepts anyone when the allowlist is empty or missing", () => {
  assert.equal(matchesAllowlist(undefined, "anyone@example.com"), true);
  assert.equal(matchesAllowlist([], "anyone@example.com"), true);
});

test("matchesAllowlist matches case-insensitively", () => {
  assert.equal(matchesAllowlist(["Sender@Example.com"], "sender@example.COM"), true);
});

test("matchesAllowlist rejects senders not on the list", () => {
  assert.equal(matchesAllowlist(["a@example.com"], "b@example.com"), false);
});

test("toEmailTriggerRuntimeBody omits empty subject and body", () => {
  const body = toEmailTriggerRuntimeBody({
    to: "fn-acme-abcd2345@hostfunc.io",
    from: "sender@example.com",
    subject: "   ",
    textBody: "",
    rawSize: 42,
    receivedAt: new Date("2026-06-10T00:00:00Z"),
  });
  assert.equal(body.hostfuncTriggerKind, "email");
  assert.equal("subject" in body.email, false);
  assert.equal("body" in body.email, false);
  assert.equal(body.email.rawSize, 42);
  assert.equal(body.email.timestamp, "2026-06-10T00:00:00.000Z");
});

test("toEmailTriggerRuntimeBody trims and includes subject and body when present", () => {
  const body = toEmailTriggerRuntimeBody({
    to: "fn-acme-abcd2345@hostfunc.io",
    from: "sender@example.com",
    subject: " Hello ",
    textBody: " hi there ",
    rawSize: 10,
    receivedAt: new Date(),
  });
  assert.equal(body.email.subject, "Hello");
  assert.equal(body.email.body, "hi there");
});
