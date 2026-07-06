import assert from "node:assert/strict";
import test from "node:test";
import { escapeXml, formatBadge, renderBadgeSvg } from "../badge";

test("no runs renders gray 'no runs'", () => {
  assert.deepEqual(formatBadge({ total: 0, errors: 0, p95WallMs: 0 }), {
    text: "no runs",
    color: "gray",
  });
});

test("green at and above 99% success", () => {
  assert.equal(formatBadge({ total: 100, errors: 0, p95WallMs: 12 }).color, "green");
  assert.equal(formatBadge({ total: 100, errors: 1, p95WallMs: 12 }).color, "green");
  assert.equal(formatBadge({ total: 1000, errors: 10, p95WallMs: 12 }).color, "green");
});

test("amber between 95% and 99% success", () => {
  assert.equal(formatBadge({ total: 100, errors: 2, p95WallMs: 12 }).color, "amber");
  assert.equal(formatBadge({ total: 100, errors: 5, p95WallMs: 12 }).color, "amber");
  assert.equal(formatBadge({ total: 1000, errors: 11, p95WallMs: 12 }).color, "amber");
});

test("red below 95% success", () => {
  assert.equal(formatBadge({ total: 100, errors: 6, p95WallMs: 12 }).color, "red");
  assert.equal(formatBadge({ total: 10, errors: 10, p95WallMs: 12 }).color, "red");
});

test("percentage rounds to one decimal, no trailing .0", () => {
  assert.equal(formatBadge({ total: 1000, errors: 8, p95WallMs: 45 }).text, "99.2% · 45ms");
  assert.equal(formatBadge({ total: 3, errors: 1, p95WallMs: 45 }).text, "66.7% · 45ms");
  assert.equal(formatBadge({ total: 100, errors: 0, p95WallMs: 45 }).text, "100% · 45ms");
  assert.equal(formatBadge({ total: 4, errors: 1, p95WallMs: 45 }).text, "75% · 45ms");
});

test("p95 is rounded to whole milliseconds", () => {
  assert.equal(formatBadge({ total: 10, errors: 0, p95WallMs: 45.6 }).text, "100% · 46ms");
});

test("escapeXml escapes all five XML special characters", () => {
  assert.equal(escapeXml(`<a & "b" 'c'>`), "&lt;a &amp; &quot;b&quot; &apos;c&apos;&gt;");
});

test("svg contains label, value, and threshold color", () => {
  const svg = renderBadgeSvg({ text: "99.2% · 45ms", color: "green" });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.ok(svg.includes(">hostfunc</text>"));
  assert.ok(svg.includes(">99.2% · 45ms</text>"));
  assert.ok(svg.includes('fill="#3fb950"'));
  assert.ok(svg.includes('aria-label="hostfunc: 99.2% · 45ms"'));
});

test("svg escapes interpolated text", () => {
  const svg = renderBadgeSvg({ text: `<img & "x">`, color: "gray" }, `a<b&'c'`);
  assert.ok(!svg.includes("<img"));
  assert.ok(svg.includes("&lt;img &amp; &quot;x&quot;&gt;"));
  assert.ok(svg.includes("a&lt;b&amp;&apos;c&apos;"));
});

test("svg widths scale with text length", () => {
  const short = renderBadgeSvg({ text: "no runs", color: "gray" });
  const long = renderBadgeSvg({ text: "99.2% · 4500ms", color: "green" });
  const widthOf = (svg: string) => Number(/width="(\d+)"/.exec(svg)?.[1]);
  const shortWidth = widthOf(short);
  const longWidth = widthOf(long);
  assert.ok(Number.isFinite(shortWidth) && Number.isFinite(longWidth));
  assert.ok(longWidth > shortWidth);
});
