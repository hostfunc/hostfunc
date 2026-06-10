import { expect, test } from "vitest";
import {
  isInternalInvoke,
  isPlatformRunHost,
  matchRunPath,
  normalizeLookup,
  resolveCustomHostTarget,
  securityHeaders,
} from "./dispatch";

test("normalizeLookup defaults missing httpRequireAuth to false", () => {
  const normalized = normalizeLookup({
    ok: true,
    fnId: "fn_test",
    orgId: "org_test",
    versionId: "ver_test",
    scriptName: "script-test",
    visibility: "public",
  });
  expect(normalized.ok).toBe(true);
  if (!normalized.ok) {
    throw new Error("expected lookup result");
  }
  expect(normalized.httpRequireAuth).toBe(false);
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
  expect(normalized.ok).toBe(true);
  if (!normalized.ok) {
    throw new Error("expected lookup result");
  }
  expect(normalized.httpRequireAuth).toBe(true);
});

test("securityHeaders includes 1-year HSTS with includeSubDomains and no preload", () => {
  const headers = securityHeaders();
  expect(headers["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
});

test("matchRunPath parses a bare run path with no asset sub-path", () => {
  expect(matchRunPath("/run/acme/hello")).toEqual({
    orgSlug: "acme",
    fnSlug: "hello",
    assetSubPath: "",
  });
});

test("matchRunPath extracts a single-segment asset sub-path", () => {
  expect(matchRunPath("/run/acme/hello/style.css")).toEqual({
    orgSlug: "acme",
    fnSlug: "hello",
    assetSubPath: "style.css",
  });
});

test("matchRunPath extracts a nested asset sub-path", () => {
  expect(matchRunPath("/run/acme/hello/assets/app.js")).toEqual({
    orgSlug: "acme",
    fnSlug: "hello",
    assetSubPath: "assets/app.js",
  });
});

test("matchRunPath rejects non-run and incomplete paths", () => {
  expect(matchRunPath("/run/acme")).toBeNull();
  expect(matchRunPath("/run")).toBeNull();
  expect(matchRunPath("/health")).toBeNull();
  expect(matchRunPath("/")).toBeNull();
});

test("isPlatformRunHost recognizes platform hosts and rejects custom domains", () => {
  expect(isPlatformRunHost("run.hostfunc.io")).toBe(true);
  expect(isPlatformRunHost("staging-run.hostfunc.io")).toBe(true);
  expect(isPlatformRunHost("f-abc-v-def.acct.workers.dev")).toBe(true);
  expect(isPlatformRunHost("localhost")).toBe(true);
  expect(isPlatformRunHost("www.example.com")).toBe(false);
  expect(isPlatformRunHost("hostfunc.io.evil.com")).toBe(false);
});

/** Minimal KVNamespace stub backed by a Map for the keys we read. */
function stubDomainIndex(entries: Record<string, unknown>) {
  return {
    get: async (key: string, _type: "json") => entries[key] ?? null,
  } as unknown as KVNamespace;
}

test("resolveCustomHostTarget maps a known host to its function with the full path as asset", async () => {
  const env = {
    DOMAIN_INDEX: stubDomainIndex({
      "www.example.com": { orgSlug: "acme", fnSlug: "site" },
    }),
  } as unknown as Parameters<typeof resolveCustomHostTarget>[0];

  await expect(resolveCustomHostTarget(env, "www.example.com", "/assets/app.js")).resolves.toEqual({
    orgSlug: "acme",
    fnSlug: "site",
    assetSubPath: "assets/app.js",
  });
  await expect(resolveCustomHostTarget(env, "www.example.com", "/")).resolves.toEqual({
    orgSlug: "acme",
    fnSlug: "site",
    assetSubPath: "",
  });
});

test("resolveCustomHostTarget returns null for an unknown host or missing binding", async () => {
  const env = {
    DOMAIN_INDEX: stubDomainIndex({}),
  } as unknown as Parameters<typeof resolveCustomHostTarget>[0];
  await expect(resolveCustomHostTarget(env, "unknown.example.com", "/")).resolves.toBeNull();

  const noBinding = {} as unknown as Parameters<typeof resolveCustomHostTarget>[0];
  await expect(resolveCustomHostTarget(noBinding, "www.example.com", "/")).resolves.toBeNull();
});

test("isInternalInvoke matches only the configured invoke token", async () => {
  const env = {
    RUNTIME_INVOKE_TOKEN: "invoke-tok",
  } as unknown as Parameters<typeof isInternalInvoke>[1];

  await expect(isInternalInvoke("Bearer invoke-tok", env)).resolves.toBe(true);
  await expect(isInternalInvoke("Bearer wrong-tok", env)).resolves.toBe(false);
  await expect(isInternalInvoke(null, env)).resolves.toBe(false);

  const noToken = {} as unknown as Parameters<typeof isInternalInvoke>[1];
  await expect(isInternalInvoke("Bearer invoke-tok", noToken)).resolves.toBe(false);
});
