import assert from "node:assert/strict";
import test from "node:test";
import { findUnsafeSvgPattern, isSvgDocument } from "../../lib/safe-svg";

const CLEAN_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient>
    <path id="icon" d="M0 0h24v24H0z"/>
  </defs>
  <use href="#icon" fill="url(#g)"/>
  <use xlink:href="#icon"/>
</svg>`;

test("isSvgDocument detects svg content case-insensitively", () => {
  assert.equal(isSvgDocument(CLEAN_LOGO), true);
  assert.equal(isSvgDocument("<SVG viewBox='0 0 1 1'></SVG>"), true);
  assert.equal(isSvgDocument("{ not svg }"), false);
});

test("clean SVGO-style logo with fragment refs passes", () => {
  assert.equal(findUnsafeSvgPattern(CLEAN_LOGO), null);
});

test("flags embedded scripts regardless of case", () => {
  assert.equal(findUnsafeSvgPattern("<svg><SCRIPT>alert(1)</SCRIPT></svg>"), "embedded scripts");
});

test("flags event handlers", () => {
  assert.equal(findUnsafeSvgPattern('<svg onload="alert(1)"></svg>'), "event handlers");
});

test("flags javascript: URIs and foreignObject", () => {
  assert.equal(
    findUnsafeSvgPattern('<svg><a href="javascript:alert(1)">x</a></svg>'),
    "javascript: URIs",
  );
  assert.equal(
    findUnsafeSvgPattern("<svg><foreignObject><body/></foreignObject></svg>"),
    "foreign objects",
  );
});

test("flags embedded images", () => {
  assert.equal(
    findUnsafeSvgPattern('<svg><image href="https://evil.example/x.png"/></svg>'),
    "embedded images",
  );
});

test("flags external href references", () => {
  assert.equal(
    findUnsafeSvgPattern('<svg><use href="https://evil.example/x.svg#f"/></svg>'),
    "external references",
  );
  assert.equal(
    findUnsafeSvgPattern('<svg><use xlink:href="https://evil.example/x.svg#f"/></svg>'),
    "external references",
  );
  assert.equal(
    findUnsafeSvgPattern("<svg><use href=https://evil.example/x.svg></use></svg>"),
    "external references",
  );
});

test("does not flag data-href attributes", () => {
  assert.equal(findUnsafeSvgPattern('<svg><path data-href="https://ok.example"/></svg>'), null);
});
