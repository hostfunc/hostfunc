import assert from "node:assert/strict";
import test from "node:test";
import { buildInboundAddress, generateAddressSuffix } from "../../lib/inbound-address";

test("builds {fn}-{org}-{suffix}@{domain}", () => {
  const address = buildInboundAddress({
    fnSlug: "my-script",
    orgSlug: "acme-corp",
    domain: "hostfunc.io",
    suffix: "abcd2345",
  });
  assert.equal(address, "my-script-acme-corp-abcd2345@hostfunc.io");
});

test("lowercases slugs and domain", () => {
  const address = buildInboundAddress({
    fnSlug: "MyScript",
    orgSlug: "Acme",
    domain: "Hostfunc.IO",
    suffix: "abcd2345",
  });
  assert.equal(address, "myscript-acme-abcd2345@hostfunc.io");
});

test("strips non-slug characters", () => {
  const address = buildInboundAddress({
    fnSlug: "my_script!",
    orgSlug: "acme corp",
    domain: "hostfunc.io",
    suffix: "abcd2345",
  });
  assert.equal(address, "myscript-acmecorp-abcd2345@hostfunc.io");
});

test("truncates long slugs to 20 chars and trims stray hyphens", () => {
  const longFn = `${"a".repeat(19)}-tail-that-gets-cut`;
  const address = buildInboundAddress({
    fnSlug: longFn,
    orgSlug: "b".repeat(40),
    domain: "hostfunc.io",
    suffix: "abcd2345",
  });
  const local = address.split("@")[0] ?? "";
  // 19 a's + the hyphen at position 20 trimmed; org truncated to 20 b's.
  assert.equal(local, `${"a".repeat(19)}-${"b".repeat(20)}-abcd2345`);
});

test("local part stays within the 64-char limit for maximal slugs", () => {
  const address = buildInboundAddress({
    fnSlug: "f".repeat(63),
    orgSlug: "o".repeat(63),
    domain: "example.com",
    suffix: "abcd2345",
  });
  const local = address.split("@")[0] ?? "";
  assert.ok(local.length <= 64, `local part too long: ${local.length}`);
});

test("empty slugs collapse instead of leaving double hyphens", () => {
  const address = buildInboundAddress({
    fnSlug: "___",
    orgSlug: "acme",
    domain: "hostfunc.io",
    suffix: "abcd2345",
  });
  assert.equal(address, "acme-abcd2345@hostfunc.io");
});

test("generateAddressSuffix returns 8 chars from the base32 alphabet", () => {
  for (let i = 0; i < 50; i++) {
    const suffix = generateAddressSuffix();
    assert.match(suffix, /^[a-z2-7]{8}$/);
  }
});

test("generateAddressSuffix is not constant", () => {
  const seen = new Set(Array.from({ length: 20 }, () => generateAddressSuffix()));
  assert.ok(seen.size > 1);
});
