import { afterEach, describe, expect, it, vi } from "vitest";
import { bundleFunction } from "../src/bundler.js";

interface WorkerModule {
  default: {
    fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response>;
  };
}

const CONTROL_PLANE = "https://control.example";
const RUNTIME_URL = "https://runtime.example";
const FN_ID = "fn_html";
const VERSION_ID = "ver_html";

const HTML_FN = `
  export async function main() {
    return { ok: true, via: "main" };
  }
`;

/**
 * Serves `files` from the control-plane asset route — the path the shim uses
 * for non-embedded assets now that no shared FN_ASSETS_KV binding is exposed to
 * the user isolate.
 */
function stubAssetFetch(files: Record<string, string>) {
  const prefix = `${CONTROL_PLANE}/api/internal/assets/${FN_ID}/${VERSION_ID}/`;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith(prefix)) {
        const path = decodeURIComponent(url.slice(prefix.length));
        const body = files[path];
        if (body === undefined) return new Response("not found", { status: 404 });
        return new Response(body, { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }),
  );
}

async function loadWorker(code: string): Promise<WorkerModule> {
  return (await import(
    `data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`
  )) as WorkerModule;
}

interface InvokeInput {
  code: string;
  files?: Record<string, string>;
  method?: string;
  accept?: string;
  assetPath?: string;
  runPath?: string;
  invocationKind?: string;
  /** Invoke with no FN_ASSETS_KV binding — the real local-dev condition. */
  noKv?: boolean;
}

async function invoke({
  code,
  files = {},
  method = "GET",
  accept,
  assetPath,
  runPath = "/run/acme/hello",
  invocationKind,
  noKv = false,
}: InvokeInput): Promise<Response> {
  const mod = await loadWorker(code);
  const headers: Record<string, string> = {
    "x-hostfunc-exec-id": "exec_1",
    "x-hostfunc-fn-id": FN_ID,
    "x-hostfunc-version-id": VERSION_ID,
    "x-hostfunc-org-id": "org_1",
    "x-hostfunc-exec-token": "exec_token",
    "x-hostfunc-control-plane": CONTROL_PLANE,
    "x-hostfunc-runtime-url": RUNTIME_URL,
    "x-hostfunc-run-path": runPath,
  };
  if (accept) headers.accept = accept;
  if (assetPath) headers["x-hostfunc-asset-path"] = assetPath;
  if (invocationKind) headers["x-hostfunc-invocation-kind"] = invocationKind;
  const init: RequestInit = { method, headers };
  if (method === "POST" || method === "PUT") init.body = JSON.stringify({});
  const request = new Request(`${RUNTIME_URL}${runPath}`, init);
  // Embedded assets never hit the network; non-embedded ones are fetched from
  // the control plane. `noKv` is retained for the embedded-asset cases.
  if (!noKv) stubAssetFetch(files);
  return mod.default.fetch(request, {}, {});
}

describe("bundled worker HTML/asset serving", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not expose a shared asset KV binding in the worker bundle", async () => {
    const { code } = await bundleFunction({ code: HTML_FN, fnId: FN_ID, versionId: VERSION_ID });
    // User code shares this isolate — a shared KV binding would let it read,
    // enumerate, or overwrite other tenants' asset blobs.
    expect(code).not.toContain("FN_ASSETS_KV");
  });

  it("serves index.html for a browser navigation, with CSP and an injected <base>", async () => {
    const { code } = await bundleFunction({ code: HTML_FN, fnId: FN_ID, versionId: VERSION_ID });
    const res = await invoke({
      code,
      files: { "index.html": "<!doctype html><html><head></head><body>hi</body></html>" },
      accept: "text/html,application/xhtml+xml",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const body = await res.text();
    expect(body).toContain('<base href="/run/acme/hello/">');
    expect(body).toContain("hi");
  });

  it("falls through to main() when the function has no index.html", async () => {
    const { code } = await bundleFunction({ code: HTML_FN, fnId: FN_ID, versionId: VERSION_ID });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    const res = await invoke({ code, files: {}, accept: "text/html" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ ok: true, via: "main" });
  });

  it("sandboxes a text/html Response returned from main() (not just static assets)", async () => {
    const HTML_RESPONSE_FN = `
      export async function main() {
        return new Response("<h1>dynamic</h1>", {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
    `;
    const { code } = await bundleFunction({
      code: HTML_RESPONSE_FN,
      fnId: FN_ID,
      versionId: VERSION_ID,
    });
    const res = await invoke({ code, files: {}, method: "POST" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await res.text()).toContain("dynamic");
  });

  it("injects a default favicon link into index.html when none is declared", async () => {
    const { code } = await bundleFunction({ code: HTML_FN, fnId: FN_ID, versionId: VERSION_ID });
    const res = await invoke({
      code,
      files: { "index.html": "<!doctype html><html><head></head><body>hi</body></html>" },
      accept: "text/html",
    });
    const body = await res.text();
    expect(body).toContain('<link rel="icon" href="favicon.ico">');
  });

  it("does not override a favicon the page already declares", async () => {
    const { code } = await bundleFunction({ code: HTML_FN, fnId: FN_ID, versionId: VERSION_ID });
    const res = await invoke({
      code,
      files: {
        "index.html":
          '<!doctype html><html><head><link rel="icon" href="/me.png"></head><body>hi</body></html>',
      },
      accept: "text/html",
    });
    const body = await res.text();
    expect(body).toContain('href="/me.png"');
    expect(body).not.toContain('href="favicon.ico"');
  });

  it("does not attach the HTML sandbox CSP to a JSON main() response", async () => {
    const { code } = await bundleFunction({ code: HTML_FN, fnId: FN_ID, versionId: VERSION_ID });
    const res = await invoke({ code, files: {}, method: "POST" });
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-security-policy")).toBeNull();
  });

  it("serves a sibling asset by sub-path with the right content-type", async () => {
    const { code } = await bundleFunction({ code: HTML_FN, fnId: FN_ID, versionId: VERSION_ID });
    const res = await invoke({
      code,
      files: { "style.css": "body{color:red}" },
      assetPath: "style.css",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(await res.text()).toBe("body{color:red}");
  });

  it("returns a plain 404 for a missing sub-path asset", async () => {
    const { code } = await bundleFunction({ code: HTML_FN, fnId: FN_ID, versionId: VERSION_ID });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    const res = await invoke({ code, files: {}, assetPath: "missing.css" });
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("text/plain");
  });

  it("serves index.html for a GET that asks for JSON, when the function ships one", async () => {
    const { code } = await bundleFunction({ code: HTML_FN, fnId: FN_ID, versionId: VERSION_ID });
    const res = await invoke({
      code,
      files: { "index.html": "<html></html>" },
      accept: "application/json",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("serves index.html for a GET with no Accept header (e.g. curl)", async () => {
    const { code } = await bundleFunction({ code: HTML_FN, fnId: FN_ID, versionId: VERSION_ID });
    const res = await invoke({
      code,
      files: { "index.html": "<html></html>" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("runs main() for a POST even when index.html exists", async () => {
    const { code } = await bundleFunction({ code: HTML_FN, fnId: FN_ID, versionId: VERSION_ID });
    const res = await invoke({
      code,
      files: { "index.html": "<html></html>" },
      method: "POST",
      accept: "text/html",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ ok: true, via: "main" });
  });

  // --- assets embedded into the bundle (no KV, no control plane) ----------

  it("embeds index.html into the bundle and serves it with no KV and no control plane", async () => {
    const { code, embeddedAssetPaths } = await bundleFunction({
      code: HTML_FN,
      fnId: FN_ID,
      versionId: VERSION_ID,
      assets: [
        {
          path: "index.html",
          mime: "text/html",
          content: Buffer.from("<!doctype html><html><head></head><body>embedded</body></html>"),
        },
      ],
    });
    expect(embeddedAssetPaths).toEqual(["index.html"]);
    const res = await invoke({ code, noKv: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    const body = await res.text();
    expect(body).toContain('<base href="/run/acme/hello/">');
    expect(body).toContain("embedded");
  });

  it("serves an embedded binary asset byte-exact", async () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255, 128, 64]);
    const { code } = await bundleFunction({
      code: HTML_FN,
      fnId: FN_ID,
      versionId: VERSION_ID,
      assets: [{ path: "logo.png", mime: "image/png", content: Buffer.from(bytes) }],
    });
    const res = await invoke({ code, noKv: true, assetPath: "logo.png" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
    const got = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(got)).toEqual(Array.from(bytes));
  });

  it("treats an embedded empty index.html as a hit, not a fall-through to main()", async () => {
    const { code } = await bundleFunction({
      code: HTML_FN,
      fnId: FN_ID,
      versionId: VERSION_ID,
      assets: [{ path: "index.html", mime: "text/html", content: Buffer.from("") }],
    });
    const res = await invoke({ code, noKv: true });
    expect(res.status).toBe(200);
    // text/html (the asset path) — not application/json (which would mean main() ran).
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("embeds and serves a nested-path asset (key normalization)", async () => {
    const { code } = await bundleFunction({
      code: HTML_FN,
      fnId: FN_ID,
      versionId: VERSION_ID,
      assets: [
        { path: "sub/app.css", mime: "text/css", content: Buffer.from("body{color:green}") },
      ],
    });
    const res = await invoke({ code, noKv: true, assetPath: "sub/app.css" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
    expect(await res.text()).toBe("body{color:green}");
  });

  it("skips an asset over the per-asset embed cap and still serves it from KV", async () => {
    const big = "x".repeat(600 * 1024); // ~600 KB, over the 512 KB per-asset cap
    const { code, embeddedAssetPaths, skippedAssets } = await bundleFunction({
      code: HTML_FN,
      fnId: FN_ID,
      versionId: VERSION_ID,
      assets: [{ path: "big.css", mime: "text/css", content: Buffer.from(big) }],
    });
    expect(embeddedAssetPaths).toEqual([]);
    expect(skippedAssets).toEqual([{ path: "big.css", reason: "too_large" }]);
    // Not embedded — it must still resolve through the KV fallback.
    const res = await invoke({ code, files: { "big.css": big }, assetPath: "big.css" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
    expect((await res.text()).length).toBe(big.length);
  });
});
