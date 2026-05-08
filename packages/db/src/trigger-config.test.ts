import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTriggerConfig } from "./trigger-config.js";

test("http trigger config defaults requireAuth to false", () => {
  const config = normalizeTriggerConfig({ http: {} });
  assert.equal(config.http?.requireAuth, false);
});

test("http trigger config preserves explicit requireAuth=true", () => {
  const config = normalizeTriggerConfig({ http: { requireAuth: true } });
  assert.equal(config.http?.requireAuth, true);
});
