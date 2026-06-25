import createMDX from "@next/mdx";
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

  // Allow `.md`/`.mdx` files to be imported (used for blog posts). The blog
  // renders MDX content from `src/content/blog/*.mdx`; post metadata lives in the
  // typed registry in `src/lib/blog.ts`, not in frontmatter.
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],

  // Better Auth needs to know about server-only modules
  serverExternalPackages: ["postgres", "drizzle-orm", "esbuild"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Docs moved to the docs.hostfunc.io subdomain. Redirects run before the
  // filesystem, so these shadow the (retained) /docs route tree and hand link
  // equity to the new origin. The map is 1:1 because the subdomain serves docs
  // at its root (/docs/cli -> docs.hostfunc.io/cli).
  async redirects() {
    return [
      { source: "/docs", destination: "https://docs.hostfunc.io", permanent: true },
      { source: "/docs/:path*", destination: "https://docs.hostfunc.io/:path*", permanent: true },
    ];
  },
};

// No remark/rehype plugins → safe under Turbopack (functions can't cross the
// JS↔Rust boundary, but we pass none).
const withMDX = createMDX({});

export default withMDX(config);
