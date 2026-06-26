import { type Loader, type Plugin, build } from "esbuild";
import type { BundleAsset } from "./bundler.js";

/**
 * Deploy-time precompile of a function's client-side entry. A function that
 * ships a `client.tsx` (or `.ts`/`.jsx`/`.js`) gets it compiled and bundled —
 * JSX/TS transformed, local modules and npm deps inlined, minified — into a
 * single `client.js` (plus `client.css` if it imports CSS). Those compiled
 * assets are served from the function's own origin, so they run under the strict
 * sandbox CSP (`script-src 'self'`) with no CDN dependency.
 *
 * The user's source files live in the database, not on disk, so esbuild reads
 * them through an in-memory virtual filesystem plugin. Bare specifiers (e.g.
 * `react`) fall through to normal node resolution from `resolveDir` — the control
 * plane's working directory (apps/web), which provides react/react-dom — so the
 * client React version tracks the platform's.
 */

const CLIENT_ENTRY_CANDIDATES = ["client.tsx", "client.ts", "client.jsx", "client.js"];

const LOADER_BY_EXT: Record<string, Loader> = {
  tsx: "tsx",
  ts: "ts",
  jsx: "jsx",
  js: "js",
  mjs: "js",
  json: "json",
  css: "css",
  txt: "text",
  svg: "text",
};

function loaderForPath(path: string): Loader {
  const ext = (path.split(".").pop() ?? "").toLowerCase();
  return LOADER_BY_EXT[ext] ?? "text";
}

function normalizeJoin(fromDir: string, spec: string): string {
  const parts = (fromDir ? `${fromDir}/${spec}` : spec).split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

/** Resolve a relative import against the in-memory asset map, trying extensions. */
function resolveInVfs(candidate: string, files: Map<string, string>): string | null {
  if (files.has(candidate)) return candidate;
  for (const ext of ["tsx", "ts", "jsx", "js", "mjs", "json", "css"]) {
    if (files.has(`${candidate}.${ext}`)) return `${candidate}.${ext}`;
  }
  for (const ext of ["tsx", "ts", "jsx", "js"]) {
    if (files.has(`${candidate}/index.${ext}`)) return `${candidate}/index.${ext}`;
  }
  return null;
}

function vfsPlugin(entry: string, files: Map<string, string>, resolveDir: string): Plugin {
  const NS = "ofn-client";
  return {
    name: "ofn-vfs",
    setup(b) {
      b.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === "entry-point") {
          return { path: entry, namespace: NS };
        }
        // Only intercept relative imports that originate from a VFS file. Once a
        // bare specifier (react) resolves to node_modules, its OWN relative
        // imports must be left to esbuild's normal file resolution.
        if (args.namespace !== NS) return undefined;
        if (args.path.startsWith(".") || args.path.startsWith("/")) {
          const fromDir = args.importer.includes("/")
            ? args.importer.slice(0, args.importer.lastIndexOf("/"))
            : "";
          const joined = normalizeJoin(args.path.startsWith("/") ? "" : fromDir, args.path);
          const resolved = resolveInVfs(joined, files);
          if (resolved) return { path: resolved, namespace: NS };
          return { errors: [{ text: `client import not found: ${args.path}` }] };
        }
        return undefined;
      });
      b.onLoad({ filter: /.*/, namespace: NS }, (args) => {
        const contents = files.get(args.path) ?? "";
        // resolveDir lets bare imports inside VFS files resolve node_modules.
        return { contents, loader: loaderForPath(args.path), resolveDir };
      });
    },
  };
}

export interface ClientBundleResult {
  /** Synthetic compiled assets to serve (client.js, optionally client.css). */
  assets: BundleAsset[];
  warnings: string[];
}

/**
 * Compile the function's client entry if it ships one. Returns null when there
 * is no `client.*` entry (the common case — most functions are API-only).
 */
export async function compileClientBundle(
  assets: readonly BundleAsset[],
  opts: { resolveDir?: string } = {},
): Promise<ClientBundleResult | null> {
  const files = new Map<string, string>();
  for (const a of assets) {
    files.set(a.path, Buffer.from(a.content).toString("utf8"));
  }
  const entry = CLIENT_ENTRY_CANDIDATES.find((c) => files.has(c));
  if (!entry) return null;

  // Bare specifiers (react, …) resolve from here; node_modules is found by
  // walking up from this directory. Defaults to the control plane's cwd.
  const resolveDir = opts.resolveDir ?? process.cwd();

  const result = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    outdir: "out",
    format: "esm",
    target: "es2020",
    platform: "browser",
    minify: true,
    sourcemap: false,
    jsx: "automatic",
    jsxImportSource: "react",
    logLevel: "silent",
    absWorkingDir: resolveDir,
    plugins: [vfsPlugin(entry, files, resolveDir)],
  });

  const out: BundleAsset[] = [];
  for (const file of result.outputFiles ?? []) {
    if (file.path.endsWith(".css")) {
      out.push({ path: "client.css", mime: "text/css", content: Buffer.from(file.contents) });
    } else if (file.path.endsWith(".js")) {
      out.push({ path: "client.js", mime: "text/javascript", content: Buffer.from(file.contents) });
    }
  }
  if (out.length === 0) return null;
  return { assets: out, warnings: result.warnings.map((w) => w.text) };
}
