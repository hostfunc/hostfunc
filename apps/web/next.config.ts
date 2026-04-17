import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: [
    "@hostfunc/db",
    "@hostfunc/sdk",
    "@hostfunc/mcp-tools",
    "@hostfunc/executor-core",
    "@hostfunc/executor-cloudflare",
  ],
  experimental: {
    typedRoutes: true,
  },
  // Better Auth needs to know about server-only modules
  serverExternalPackages: ["postgres", "drizzle-orm", "esbuild"],
};

export default config;
