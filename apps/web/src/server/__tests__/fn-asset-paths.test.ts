import assert from "node:assert/strict";
import test from "node:test";
import { AssetError, classifyAsset, sanitizeAssetPath } from "../fn-asset-paths";

test("sanitizeAssetPath accepts simple POSIX paths", () => {
  assert.equal(sanitizeAssetPath("README.md"), "README.md");
  assert.equal(sanitizeAssetPath("images/logo.png"), "images/logo.png");
  assert.equal(sanitizeAssetPath("fonts/Inter-Regular.woff2"), "fonts/Inter-Regular.woff2");
});

test("sanitizeAssetPath strips leading ./", () => {
  assert.equal(sanitizeAssetPath("./images/photo.jpg"), "images/photo.jpg");
});

test("sanitizeAssetPath normalizes backslashes to forward slashes", () => {
  assert.equal(sanitizeAssetPath("images\\hero.png"), "images/hero.png");
});

test("sanitizeAssetPath rejects absolute paths", () => {
  assert.throws(() => sanitizeAssetPath("/etc/passwd"), AssetError);
});

test("sanitizeAssetPath rejects parent traversal", () => {
  assert.throws(() => sanitizeAssetPath("../secrets.env"), AssetError);
  assert.throws(() => sanitizeAssetPath("images/../../etc"), AssetError);
});

test("sanitizeAssetPath rejects empty paths", () => {
  assert.throws(() => sanitizeAssetPath(""), AssetError);
  assert.throws(() => sanitizeAssetPath("   "), AssetError);
});

test("sanitizeAssetPath rejects reserved index.ts", () => {
  assert.throws(
    () => sanitizeAssetPath("index.ts"),
    (err: unknown) => err instanceof AssetError && (err as AssetError).code === "reserved_path",
  );
});

test("sanitizeAssetPath rejects null bytes and weird chars", () => {
  assert.throws(() => sanitizeAssetPath("images/foo\u0000.png"), AssetError);
  assert.throws(() => sanitizeAssetPath("images/foo;rm -rf.png"), AssetError);
});

test("sanitizeAssetPath rejects paths that are too long", () => {
  const longSegment = "a".repeat(121);
  assert.throws(() => sanitizeAssetPath(`images/${longSegment}.png`), AssetError);
});

test("classifyAsset detects README.md regardless of mime", () => {
  assert.deepEqual(classifyAsset("README.md", ""), { kind: "readme", mime: "text/markdown" });
  assert.deepEqual(classifyAsset("README.md", "application/octet-stream"), {
    kind: "readme",
    mime: "text/markdown",
  });
});

test("classifyAsset accepts known image mimes", () => {
  assert.deepEqual(classifyAsset("images/a.png", "image/png"), {
    kind: "image",
    mime: "image/png",
  });
  assert.deepEqual(classifyAsset("images/a.svg", ""), {
    kind: "image",
    mime: "image/svg+xml",
  });
});

test("classifyAsset accepts known font mimes", () => {
  assert.deepEqual(classifyAsset("fonts/Inter.woff2", "font/woff2"), {
    kind: "font",
    mime: "font/woff2",
  });
  assert.deepEqual(classifyAsset("fonts/Inter.ttf", ""), {
    kind: "font",
    mime: "font/ttf",
  });
});

test("classifyAsset rejects unsupported mimes", () => {
  assert.throws(() => classifyAsset("danger.exe", "application/x-msdownload"), AssetError);
  assert.throws(() => classifyAsset("archive.zip", "application/zip"), AssetError);
  assert.throws(() => classifyAsset("clip.mp4", "video/mp4"), AssetError);
});

test("classifyAsset accepts html, style, and script assets", () => {
  assert.deepEqual(classifyAsset("index.html", ""), { kind: "html", mime: "text/html" });
  assert.deepEqual(classifyAsset("styles/site.css", "text/css"), {
    kind: "style",
    mime: "text/css",
  });
  assert.deepEqual(classifyAsset("scripts/app.js", "application/javascript"), {
    kind: "script",
    mime: "text/javascript",
  });
});

test("classifyAsset accepts text/markdown and text/plain via extension", () => {
  assert.deepEqual(classifyAsset("notes.md", ""), {
    kind: "other",
    mime: "text/markdown",
  });
  assert.deepEqual(classifyAsset("notes.txt", ""), {
    kind: "other",
    mime: "text/plain",
  });
});
