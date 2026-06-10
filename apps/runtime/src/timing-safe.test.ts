import { expect, test } from "vitest";
import { isAuthorizedBearer, timingSafeEqualStr } from "./timing-safe";

test("timingSafeEqualStr matches equal strings", async () => {
  await expect(timingSafeEqualStr("secret-token", "secret-token")).resolves.toBe(true);
  await expect(timingSafeEqualStr("", "")).resolves.toBe(true);
  await expect(timingSafeEqualStr("ünïcødé ✓", "ünïcødé ✓")).resolves.toBe(true);
});

test("timingSafeEqualStr rejects same-length different strings", async () => {
  await expect(timingSafeEqualStr("aaaaaaaa", "aaaaaaab")).resolves.toBe(false);
});

test("timingSafeEqualStr rejects different lengths without throwing", async () => {
  await expect(timingSafeEqualStr("short", "a-much-longer-string")).resolves.toBe(false);
  await expect(timingSafeEqualStr("", "non-empty")).resolves.toBe(false);
});

test("isAuthorizedBearer accepts an exact Bearer match", async () => {
  await expect(isAuthorizedBearer("Bearer tok-123", "tok-123")).resolves.toBe(true);
});

test("isAuthorizedBearer rejects missing header or token", async () => {
  await expect(isAuthorizedBearer(null, "tok-123")).resolves.toBe(false);
  await expect(isAuthorizedBearer("Bearer tok-123", undefined)).resolves.toBe(false);
  await expect(isAuthorizedBearer("Bearer tok-123", "")).resolves.toBe(false);
});

test("isAuthorizedBearer requires the exact Bearer format", async () => {
  await expect(isAuthorizedBearer("bearer tok-123", "tok-123")).resolves.toBe(false);
  await expect(isAuthorizedBearer("tok-123", "tok-123")).resolves.toBe(false);
  await expect(isAuthorizedBearer("Bearer tok-123EXTRA", "tok-123")).resolves.toBe(false);
  await expect(isAuthorizedBearer("Bearer tok-12", "tok-123")).resolves.toBe(false);
});
