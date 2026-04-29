import assert from "node:assert/strict";
import test from "node:test";
import { renderMarketplaceReadme } from "../../lib/marketplace-readme";

test("renderMarketplaceReadme rewrites relative image src to /api/marketplace path", () => {
  const html = renderMarketplaceReadme("# Title\n\n![logo](images/logo.png)\n", "fn_abc");
  assert.match(html, /\/api\/marketplace\/fn_abc\/assets\/images\/logo\.png/);
});

test("renderMarketplaceReadme rewrites relative anchor href but keeps absolute URLs", () => {
  const html = renderMarketplaceReadme(
    "[docs](docs/start.md) and [external](https://example.com/x).",
    "fn_xyz",
  );
  assert.match(html, /\/api\/marketplace\/fn_xyz\/assets\/docs\/start\.md/);
  assert.match(html, /href="https:\/\/example\.com\/x"/);
});

test("renderMarketplaceReadme leaves anchor fragments untouched", () => {
  const html = renderMarketplaceReadme("[Top](#top)", "fn_xyz");
  assert.match(html, /href="#top"/);
});

test("renderMarketplaceReadme returns empty string for empty/whitespace input", () => {
  assert.equal(renderMarketplaceReadme("", "fn_xyz"), "");
  assert.equal(renderMarketplaceReadme("   \n\t\n", "fn_xyz"), "");
});

test("renderMarketplaceReadme handles ./relative paths", () => {
  const html = renderMarketplaceReadme("![hero](./images/hero.jpg)", "fn_1");
  assert.match(html, /\/api\/marketplace\/fn_1\/assets\/images\/hero\.jpg/);
});
