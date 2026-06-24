import Link from "next/link";

import { PolicyPageShell } from "@/components/marketing/policy-page-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Changelog",
  description: "Everything that shipped in hostfunc across the platform, runtime, SDK, and CLI.",
  path: "/changelog",
});

export default function ChangelogPage() {
  return (
    <PolicyPageShell
      eyebrow="Product"
      title="Changelog"
      subtitle="Track what shipped in hostfunc across platform, runtime, SDK, and CLI."
      effectiveDate="April 2026"
    >
      <div className="space-y-8">
        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">Latest updates</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            We publish detailed change history in GitHub pull requests and release/version PRs.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="https://github.com/hostfunc/hostfunc/pulls?q=is%3Apr+is%3Aclosed"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
            >
              View merged PRs
            </Link>
            <Link
              href="https://github.com/hostfunc/hostfunc/commits/main"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
            >
              View main commits
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">Release notes format</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-[var(--color-bone-muted)]">
            <li>Runtime and dispatch behavior changes (auth, triggers, execution flow).</li>
            <li>SDK and CLI improvements, including versioned package updates.</li>
            <li>Security and operational updates affecting production posture.</li>
            <li>Documentation and legal/marketing content updates when relevant.</li>
          </ul>
        </section>
      </div>
    </PolicyPageShell>
  );
}
