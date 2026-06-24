import Deploy90s from "@/content/blog/deploy-typescript-function-90-seconds.mdx";
import SelfHost from "@/content/blog/self-hosting-hostfunc-cloudflare.mdx";
import WhyMcp from "@/content/blog/why-we-built-mcp-native-function-platform.mdx";
import type { ComponentType } from "react";

/**
 * Maps a blog post slug to its rendered MDX body. This is the ONLY module that
 * imports `.mdx`, so anything that just needs post metadata can import the
 * `.mdx`-free `blog.ts` instead and stay loadable outside the bundler.
 */
export const blogComponents: Record<string, ComponentType> = {
  "deploy-typescript-function-90-seconds": Deploy90s,
  "why-we-built-mcp-native-function-platform": WhyMcp,
  "self-hosting-hostfunc-cloudflare": SelfHost,
};
