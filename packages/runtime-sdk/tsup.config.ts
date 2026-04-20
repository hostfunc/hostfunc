import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    ai: "src/ai/index.ts",
    agent: "src/agent/index.ts",
    vector: "src/vector/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "es2022",
  outDir: "dist",
  minify: false,
});
