import assert from "node:assert/strict";
import test from "node:test";
import { magicLinkEmail, orgInviteEmail, orgInviteResendEmail } from "../email-templates";

const LOGO = "/logo-email.png";

function assertWellFormed(html: string) {
  assert.ok(html.includes("<!doctype html>"), "has doctype");
  assert.ok(html.includes(LOGO), "includes hosted logo url");
  assert.ok(!html.includes("${"), "no unresolved template placeholders");
  assert.ok(!/>\s*undefined\s*</.test(html), "no stray 'undefined' in markup");
}

test("magicLinkEmail embeds the sign-in url and renders the shell", () => {
  const url = "https://app.hostfunc.io/api/auth/magic-link/verify?token=abc123";
  const mail = magicLinkEmail({ url });
  assert.equal(mail.subject, "Your hostfunc sign-in link");
  assertWellFormed(mail.html);
  assert.ok(mail.html.includes(url), "html contains the magic link");
  assert.ok(mail.text.includes(url), "text contains the magic link");
});

test("orgInviteEmail embeds inviter, org, and accept link", () => {
  const inviteLink = "https://app.hostfunc.io/join?invitationId=inv_123";
  const mail = orgInviteEmail({
    inviterName: "Ada Lovelace",
    orgName: "Acme",
    inviteLink,
  });
  assert.ok(mail.subject.includes("Acme"));
  assertWellFormed(mail.html);
  assert.ok(mail.html.includes(inviteLink));
  assert.ok(mail.html.includes("Ada Lovelace"));
  assert.ok(mail.text.includes(inviteLink));
});

test("orgInviteResendEmail embeds role, expiry, and accept url", () => {
  const acceptUrl = "https://app.hostfunc.io/join?invitationId=inv_456";
  const expiresAt = new Date("2026-07-01T00:00:00Z");
  const mail = orgInviteResendEmail({
    orgName: "Acme",
    role: "admin",
    acceptUrl,
    expiresAt,
  });
  assertWellFormed(mail.html);
  assert.ok(mail.html.includes(acceptUrl));
  assert.ok(mail.html.includes("admin"));
  assert.ok(mail.html.includes(expiresAt.toUTCString()));
  assert.ok(mail.text.includes(acceptUrl));
});

test("user-supplied values are HTML-escaped (no injection)", () => {
  const mail = orgInviteEmail({
    inviterName: '<script>alert("x")</script>',
    orgName: "Tom & Jerry <b>",
    inviteLink: "https://app.hostfunc.io/join?invitationId=inv_x&y=1",
  });
  assert.ok(!mail.html.includes("<script>"), "script tag escaped");
  assert.ok(mail.html.includes("&lt;script&gt;"), "escaped entity present");
  assert.ok(mail.html.includes("Tom &amp; Jerry"), "ampersand escaped");
});
