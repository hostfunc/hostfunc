import { expect, test } from "vitest";
import { DEFAULT_MAX_BODY_BYTES, readBodyWithLimit, resolveMaxBodyBytes } from "./body-limit";

test("resolveMaxBodyBytes parses a valid override", () => {
  expect(resolveMaxBodyBytes("2048")).toBe(2048);
});

test("resolveMaxBodyBytes falls back on missing or invalid values", () => {
  expect(resolveMaxBodyBytes(undefined)).toBe(DEFAULT_MAX_BODY_BYTES);
  expect(resolveMaxBodyBytes("")).toBe(DEFAULT_MAX_BODY_BYTES);
  expect(resolveMaxBodyBytes("abc")).toBe(DEFAULT_MAX_BODY_BYTES);
  expect(resolveMaxBodyBytes("0")).toBe(DEFAULT_MAX_BODY_BYTES);
  expect(resolveMaxBodyBytes("-1")).toBe(DEFAULT_MAX_BODY_BYTES);
});

test("readBodyWithLimit reads a body under the cap", async () => {
  const req = new Request("https://example.com/run/a/b", {
    method: "POST",
    body: JSON.stringify({ hello: "world" }),
  });
  const result = await readBodyWithLimit(req, 1024);
  expect(result).toEqual({ ok: true, text: JSON.stringify({ hello: "world" }) });
});

test("readBodyWithLimit returns empty text for a request without a body", async () => {
  const req = new Request("https://example.com/run/a/b", { method: "GET" });
  const result = await readBodyWithLimit(req, 1024);
  expect(result).toEqual({ ok: true, text: "" });
});

test("readBodyWithLimit rejects on an oversized Content-Length without reading", async () => {
  const req = new Request("https://example.com/run/a/b", {
    method: "POST",
    body: "small",
    headers: { "content-length": "9999999" },
  });
  const result = await readBodyWithLimit(req, 1024);
  expect(result).toEqual({ ok: false, reason: "too_large" });
});

test("readBodyWithLimit aborts a stream that exceeds the cap mid-read", async () => {
  const chunk = new TextEncoder().encode("x".repeat(512));
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(chunk);
    },
    cancel() {
      cancelled = true;
    },
  });
  const req = new Request("https://example.com/run/a/b", {
    method: "POST",
    body: stream,
    // @ts-expect-error duplex is required for streaming bodies in Node fetch
    duplex: "half",
  });
  const result = await readBodyWithLimit(req, 1024);
  expect(result).toEqual({ ok: false, reason: "too_large" });
  expect(cancelled).toBe(true);
});

test("readBodyWithLimit accepts a body exactly at the cap", async () => {
  const body = "y".repeat(64);
  const req = new Request("https://example.com/run/a/b", { method: "POST", body });
  const result = await readBodyWithLimit(req, 64);
  expect(result).toEqual({ ok: true, text: body });
});
