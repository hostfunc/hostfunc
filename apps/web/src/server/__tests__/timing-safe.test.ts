import assert from "node:assert/strict";
import test from "node:test";
import { isAuthorizedBearer, timingSafeEqualString } from "../../lib/timing-safe";

test("timingSafeEqualString matches equal strings", () => {
  assert.equal(timingSafeEqualString("secret-token", "secret-token"), true);
  assert.equal(timingSafeEqualString("", ""), true);
});

test("timingSafeEqualString rejects different strings without throwing", () => {
  assert.equal(timingSafeEqualString("aaaaaaaa", "aaaaaaab"), false);
  assert.equal(timingSafeEqualString("short", "a-much-longer-string"), false);
  assert.equal(timingSafeEqualString("", "non-empty"), false);
});

test("isAuthorizedBearer accepts an exact Bearer match", () => {
  assert.equal(isAuthorizedBearer("Bearer tok-123", ["tok-123"]), true);
});

test("isAuthorizedBearer accepts a match on any listed token", () => {
  assert.equal(isAuthorizedBearer("Bearer second", ["first", "second"]), true);
});

test("isAuthorizedBearer skips empty tokens", () => {
  assert.equal(isAuthorizedBearer("Bearer ", [""]), false);
  assert.equal(isAuthorizedBearer("Bearer tok", ["", "tok"]), true);
});

test("isAuthorizedBearer rejects missing header or wrong format", () => {
  assert.equal(isAuthorizedBearer(null, ["tok-123"]), false);
  assert.equal(isAuthorizedBearer("bearer tok-123", ["tok-123"]), false);
  assert.equal(isAuthorizedBearer("tok-123", ["tok-123"]), false);
  assert.equal(isAuthorizedBearer("Bearer tok-123EXTRA", ["tok-123"]), false);
  assert.equal(isAuthorizedBearer("Bearer tok-123", []), false);
});
