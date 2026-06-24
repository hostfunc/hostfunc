import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quickstart",
  description: "Create a function, deploy it, and invoke /run/:owner/:slug on hostfunc.",
};

export default function QuickstartPage() {
  return (
    <article>
      <h1>Quickstart</h1>
      <p>Create a function in the dashboard, deploy it, and invoke `/run/:owner/:slug`.</p>
    </article>
  );
}
