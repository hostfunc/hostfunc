import assert from "node:assert/strict";
import test from "node:test";
import { parentCookieDomain } from "../../lib/cookie-domain";

test("derives parent domain from a subdomain host", () => {
  assert.equal(parentCookieDomain("https://app.hostfunc.io"), ".hostfunc.io");
  assert.equal(parentCookieDomain("https://www.hostfunc.io/login"), ".hostfunc.io");
});

test("derives parent domain from the apex host", () => {
  assert.equal(parentCookieDomain("https://hostfunc.io"), ".hostfunc.io");
});

test("returns undefined for localhost", () => {
  assert.equal(parentCookieDomain("http://localhost:3000"), undefined);
});

test("returns undefined for bare IP hosts", () => {
  assert.equal(parentCookieDomain("http://127.0.0.1:3000"), undefined);
});

test("returns undefined for malformed input", () => {
  assert.equal(parentCookieDomain("not a url"), undefined);
});
