import assert from "node:assert/strict";
import test from "node:test";
import { inferPayloadStatic, parsePayloadCandidate } from "../payload-inference";

test("infers inline object input payload", () => {
  const result = inferPayloadStatic(`
export async function main(input: { customerId: string; retries?: number; dryRun: boolean }) {
  return { ok: true };
}
`);
  assert.equal(result.ok, true);
  assert.deepEqual(result.payload, {
    customerId: "test_value",
    retries: 123,
    dryRun: true,
  });
});

test("infers named interface payload", () => {
  const result = inferPayloadStatic(`
interface Input {
  orgId: string;
  topK?: number;
  tags: string[];
}
export async function main(input: Input) {
  return input;
}
`);
  assert.equal(result.ok, true);
  assert.deepEqual(result.payload, {
    orgId: "test_value",
    topK: 123,
    tags: ["test_value"],
  });
});

test("returns fallback-needed for ambiguous input", () => {
  const result = inferPayloadStatic(`
export async function main(input: InputFromElsewhere) {
  return input;
}
`);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "no_parseable_input_shape");
});

test("parsePayloadCandidate rejects malformed payload JSON", () => {
  const result = parsePayloadCandidate("{not-json");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_json");
});

