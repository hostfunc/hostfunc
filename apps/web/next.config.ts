import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@hostfunc/db", "@hostfunc/fn", "@hostfunc/executor-core"],
  experimental: {
    typedRoutes: true,
  },
  // Better Auth needs to know about server-only modules
  serverExternalPackages: ["postgres", "drizzle-orm"],
};

export default config;