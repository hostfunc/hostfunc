import { renderOgImage } from "@/lib/og";

/**
 * The "Documentation" social card, served as a plain route handler so it can be
 * referenced explicitly from every docs page's metadata. (A colocated
 * `opengraph-image` file only auto-injects for its own segment and isn't
 * inherited by descendant routes, so a shared, addressable URL is simpler.)
 */
export function GET() {
  return renderOgImage({
    eyebrow: "Documentation",
    title: "Build, deploy, and operate functions.",
    subtitle: "Guides, the CLI, SDK reference, MCP, and security — everything to ship on hostfunc.",
  });
}
