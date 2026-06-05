import { describe, expect, it } from "vitest";
import {
  ENTRY_FILE,
  type ProjectConfig,
  generateTsconfig,
  localStatus,
  parseProjectConfig,
  serializeProjectConfig,
  sha256,
} from "./project.js";

const CONFIG: ProjectConfig = {
  baseUrl: "https://hostfunc.dev",
  fnId: "fn_1",
  orgSlug: "acme",
  slug: "hello",
  sha256: sha256("code-a"),
};

describe("project config", () => {
  it("round-trips through serialize/parse", () => {
    const parsed = parseProjectConfig(serializeProjectConfig(CONFIG));
    expect(parsed).toEqual(CONFIG);
  });

  it("defaults optional fields and requires fnId/baseUrl/slug", () => {
    const parsed = parseProjectConfig(
      JSON.stringify({ baseUrl: "https://x", fnId: "fn_2", slug: "s" }),
    );
    expect(parsed.orgSlug).toBe("");
    expect(parsed.sha256).toBe("");
    expect(() => parseProjectConfig(JSON.stringify({ baseUrl: "https://x" }))).toThrow();
  });
});

describe("localStatus", () => {
  it("detects unchanged vs modified against the merge base", () => {
    expect(localStatus("code-a", CONFIG)).toBe("unchanged");
    expect(localStatus("code-b", CONFIG)).toBe("modified");
  });
});

describe("generateTsconfig", () => {
  it("maps @hostfunc/sdk to the bundled .d.ts and includes the entry file", () => {
    const tsconfig = JSON.parse(generateTsconfig());
    expect(tsconfig.compilerOptions.paths["@hostfunc/sdk"][0]).toContain("hostfunc-sdk.d.ts");
    expect(tsconfig.compilerOptions.paths["@hostfunc/sdk/*"][0]).toContain("hostfunc-sdk.d.ts");
    expect(tsconfig.include).toContain(ENTRY_FILE);
    expect(tsconfig.compilerOptions.noEmit).toBe(true);
  });
});
