import type { NextConfig } from "next";

const securityHeaders = [
  // HSTS without `preload` — submission to the preload list is a 12+ month one-way
  // street. Revisit once we've stayed clean for ~90 days.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

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

  typedRoutes: true,

  // Better Auth needs to know about server-only modules
  serverExternalPackages: ["postgres", "drizzle-orm", "esbuild"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
