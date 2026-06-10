import { createHash } from "node:crypto";

/**
 * Pure helpers for the local-first project layout. No `vscode` dependency, so they're unit-testable.
 *
 * On-disk layout of a function checkout:
 *   hostfunc.json          { baseUrl, fnId, orgSlug, slug, sha256 }  — sha256 is the merge base
 *   index.ts               the function source (⇄ server draft / version code)
 *   tsconfig.json          generated; maps @hostfunc/sdk to the bundled .d.ts
 *   .hostfunc/types/…      bundled SDK type declarations (written by the extension)
 */

export const PROJECT_CONFIG_FILE = "hostfunc.json";
export const ENTRY_FILE = "index.ts";
export const TYPES_DIR = ".hostfunc/types";
export const SDK_DTS_NAME = "hostfunc-sdk.d.ts";

export interface ProjectConfig {
  baseUrl: string;
  fnId: string;
  orgSlug: string;
  slug: string;
  /** sha256 of the code last pulled/pushed — the merge base for conflict detection. */
  sha256: string;
}

export function sha256(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function parseProjectConfig(text: string): ProjectConfig {
  const parsed = JSON.parse(text) as Partial<ProjectConfig>;
  if (!parsed.fnId || !parsed.baseUrl || !parsed.slug) {
    throw new Error("hostfunc.json is missing required fields (fnId, baseUrl, slug).");
  }
  return {
    baseUrl: parsed.baseUrl,
    fnId: parsed.fnId,
    orgSlug: parsed.orgSlug ?? "",
    slug: parsed.slug,
    sha256: parsed.sha256 ?? "",
  };
}

export function serializeProjectConfig(config: ProjectConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

/** tsconfig that points `@hostfunc/sdk` at the bundled .d.ts so IntelliSense works without install. */
export function generateTsconfig(): string {
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      lib: ["ES2023"],
      strict: true,
      noEmit: true,
      types: [],
      paths: {
        "@hostfunc/sdk": [`./${TYPES_DIR}/${SDK_DTS_NAME}`],
        "@hostfunc/sdk/*": [`./${TYPES_DIR}/${SDK_DTS_NAME}`],
      },
    },
    include: [ENTRY_FILE],
  };
  return `${JSON.stringify(tsconfig, null, 2)}\n`;
}

export function gitignoreContent(): string {
  return [".hostfunc/", "node_modules/", ""].join("\n");
}

export const DEFAULT_ENTRY = `import fn from "@hostfunc/sdk";

export async function main(input: { name?: string }) {
  const name = input.name?.trim() || "world";
  fn.log("info", "hello.invoked", { name });
  return { message: \`hello, \${name}\`, invokedAt: new Date().toISOString() };
}
`;

/** Classifies a `push` outcome by comparing local code against the recorded merge base. */
export function localStatus(localCode: string, base: ProjectConfig): "unchanged" | "modified" {
  return sha256(localCode) === base.sha256 ? "unchanged" : "modified";
}
