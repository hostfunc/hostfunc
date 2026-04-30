import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLookup } from "./dispatch";

test("normalizeLookup defaults missing httpRequireAuth to false", () => {
  const normalized = normalizeLookup({
    ok: true,
    fnId: "fn_test",
    orgId: "org_test",
    versionId: "ver_test",
    scriptName: "script-test",
    visibility: "public",
  });
  assert.equal(normalized.ok, true);
  if (!normalized.ok) {
    throw new Error("expected lookup result");
  }
  assert.equal(normalized.httpRequireAuth, false);
});

test("normalizeLookup preserves explicit httpRequireAuth=true", () => {
  const normalized = normalizeLookup({
    ok: true,
    fnId: "fn_test",
    orgId: "org_test",
    versionId: "ver_test",
    scriptName: "script-test",
    visibility: "public",
    httpRequireAuth: true,
  });
  assert.equal(normalized.ok, true);
  if (!normalized.ok) {
    throw new Error("expected lookup result");
  }
  assert.equal(normalized.httpRequireAuth, true);
});
