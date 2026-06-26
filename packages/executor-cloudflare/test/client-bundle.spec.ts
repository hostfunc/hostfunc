import { describe, expect, it } from "vitest";
import { bundleFunction } from "../src/bundler.js";
import { compileClientBundle } from "../src/client-bundler.js";

function asset(path: string, content: string) {
  return { path, mime: "text/plain", content: Buffer.from(content, "utf8") };
}

// TypeScript client with DOM work and a relative import — no npm deps, so the
// bundle is self-contained and resolves with no node_modules in the test cwd.
// (React resolution is exercised in the real control-plane cwd, apps/web.)
const TS_CLIENT = `
  import { greeting } from "./greeting";
  const heading: HTMLElement | null = document.getElementById("title");
  if (heading) heading.textContent = greeting("hostfunc");
`;
const GREETING_MODULE = `export const greeting = (who: string): string => "hi " + who;`;

const API_FN = `
  export async function main() {
    return { ok: true };
  }
`;

describe("client-side precompile", () => {
  it("returns null when the function ships no client entry", async () => {
    const result = await compileClientBundle([asset("index.html", "<html></html>")]);
    expect(result).toBeNull();
  });

  it("compiles a TypeScript client into a single minified client.js", async () => {
    const result = await compileClientBundle([
      asset("index.html", '<html><body><h1 id="title"></h1></body></html>'),
      asset("client.ts", TS_CLIENT),
      asset("greeting.ts", GREETING_MODULE),
    ]);
    expect(result).not.toBeNull();
    const js = result?.assets.find((a) => a.path === "client.js");
    expect(js).toBeTruthy();
    const text = Buffer.from(js?.content ?? Buffer.alloc(0)).toString("utf8");
    // The TS types are stripped and the local module is inlined (bundled).
    expect(text).toContain("hi ");
    expect(text).not.toMatch(/import\s*\{/);
  });

  it("reports a clear error when a client import can't be resolved", async () => {
    await expect(
      compileClientBundle([asset("client.ts", `import "./missing";`)]),
    ).rejects.toThrow();
  });

  it("embeds the compiled client.js into the worker bundle so it serves under CSP", async () => {
    const built = await bundleFunction({
      code: API_FN,
      fnId: "fn_client",
      versionId: "ver_client",
      assets: [
        asset(
          "index.html",
          '<html><body><h1 id="title"></h1><script type="module" src="client.js"></script></body></html>',
        ),
        asset("client.ts", TS_CLIENT),
        asset("greeting.ts", GREETING_MODULE),
      ],
    });
    expect(built.embeddedAssetPaths).toContain("client.js");
  });
});
