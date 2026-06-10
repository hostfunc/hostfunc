import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifySvixSignature } from "../../lib/svix-verify";

const SECRET_BYTES = Buffer.from("0123456789abcdef0123456789abcdef");
const SECRET = `whsec_${SECRET_BYTES.toString("base64")}`;

function sign(id: string, timestamp: string, payload: string): string {
  const mac = createHmac("sha256", SECRET_BYTES).update(`${id}.${timestamp}.${payload}`).digest();
  return `v1,${mac.toString("base64")}`;
}

const NOW = 1_750_000_000_000; // fixed clock (ms)
const ts = String(Math.floor(NOW / 1000));
const fixedNow = () => NOW;

test("accepts a valid signature", () => {
  const payload = JSON.stringify({ type: "email.received", data: { email_id: "em_1" } });
  const ok = verifySvixSignature({
    secret: SECRET,
    payload,
    id: "msg_1",
    timestamp: ts,
    signature: sign("msg_1", ts, payload),
    now: fixedNow,
  });
  assert.equal(ok, true);
});

test("rejects a tampered payload", () => {
  const payload = '{"a":1}';
  const ok = verifySvixSignature({
    secret: SECRET,
    payload: '{"a":2}',
    id: "msg_1",
    timestamp: ts,
    signature: sign("msg_1", ts, payload),
    now: fixedNow,
  });
  assert.equal(ok, false);
});

test("rejects an expired timestamp", () => {
  const oldTs = String(Math.floor(NOW / 1000) - 3600);
  const payload = "{}";
  const ok = verifySvixSignature({
    secret: SECRET,
    payload,
    id: "msg_1",
    timestamp: oldTs,
    signature: sign("msg_1", oldTs, payload),
    now: fixedNow,
  });
  assert.equal(ok, false);
});

test("accepts when only the second space-separated signature matches", () => {
  const payload = "{}";
  const bogus = `v1,${Buffer.alloc(32).toString("base64")}`;
  const ok = verifySvixSignature({
    secret: SECRET,
    payload,
    id: "msg_1",
    timestamp: ts,
    signature: `${bogus} ${sign("msg_1", ts, payload)}`,
    now: fixedNow,
  });
  assert.equal(ok, true);
});

test("rejects unknown signature versions and malformed entries without throwing", () => {
  const ok = verifySvixSignature({
    secret: SECRET,
    payload: "{}",
    id: "msg_1",
    timestamp: ts,
    signature: "v2,zzzz not-a-pair v1,!!!notbase64!!!",
    now: fixedNow,
  });
  assert.equal(ok, false);
});

test("rejects missing inputs and non-numeric timestamps", () => {
  assert.equal(
    verifySvixSignature({
      secret: "",
      payload: "{}",
      id: "msg_1",
      timestamp: ts,
      signature: "v1,abc",
      now: fixedNow,
    }),
    false,
  );
  assert.equal(
    verifySvixSignature({
      secret: SECRET,
      payload: "{}",
      id: "msg_1",
      timestamp: "not-a-number",
      signature: "v1,abc",
      now: fixedNow,
    }),
    false,
  );
});

test("handles secrets without the whsec_ prefix", () => {
  const payload = "{}";
  const ok = verifySvixSignature({
    secret: SECRET_BYTES.toString("base64"),
    payload,
    id: "msg_1",
    timestamp: ts,
    signature: sign("msg_1", ts, payload),
    now: fixedNow,
  });
  assert.equal(ok, true);
});
