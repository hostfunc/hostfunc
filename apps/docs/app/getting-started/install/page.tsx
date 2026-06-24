import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Install",
  description: "Install hostfunc: Node 22+, pnpm 9+, then pnpm install and pnpm setup.",
};

export default function InstallPage() {
  return (
    <article>
      <h1>Install</h1>
      <p>Use Node 22+, pnpm 9+, then run `pnpm install` and `pnpm setup`.</p>
    </article>
  );
}
