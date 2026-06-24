import type { MDXComponents } from "mdx/types";

/**
 * Required by `@next/mdx` in the App Router. Blog posts render inside a
 * `.markdown-readme` container (see `globals.css`), which styles the generated
 * HTML elements directly, so no per-element component overrides are needed here.
 */
const components: MDXComponents = {};

export function useMDXComponents(): MDXComponents {
  return components;
}
