import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Architecture",
  description:
    "How hostfunc is built: a Next.js control plane, Cloudflare runtime workers, and Postgres.",
};

export default function ArchitecturePage() {
  return (
    <article>
      <h1>Architecture</h1>
      <p>Hostfunc uses a Next.js control plane, Cloudflare runtime workers, and Postgres.</p>
    </article>
  );
}
