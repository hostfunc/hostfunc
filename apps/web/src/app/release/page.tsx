import { PolicyPageShell } from "@/components/marketing/policy-page-shell";

export default function ReleasePage() {
  return (
    <PolicyPageShell
      eyebrow="Release"
      title="Changesets and npm release workflow"
      subtitle="How hostfunc versions and publishes public packages, and the safeguards we run before any release."
      effectiveDate="April 2026"
    >
      <div className="space-y-10">
        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">What hostfunc publishes</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            Public npm publishing is currently scoped to:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-[var(--color-bone-muted)]">
            <li>
              <code className="font-mono text-[var(--color-bone)]">@hostfunc/cli</code>
            </li>
            <li>
              <code className="font-mono text-[var(--color-bone)]">@hostfunc/sdk</code>
            </li>
          </ul>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            Internal libraries (database/executor/tooling packages) are infrastructure dependencies
            and are not published as public package artifacts.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">Release flow</h2>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-[var(--color-bone-muted)]">
            <li>Create one or more changesets describing version intent.</li>
            <li>Changesets generates a version PR with package/changelog updates.</li>
            <li>
              After merge, release workflow runs validation gates and publishes eligible packages.
            </li>
            <li>
              Release provenance and npm metadata are emitted by the publish step when configured.
            </li>
          </ol>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">Release safeguards</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-[var(--color-bone-muted)]">
            <li>Monorepo install with frozen lockfile in CI.</li>
            <li>Lint, typecheck, and tests before release actions.</li>
            <li>CLI pack smoke test to validate installability and baseline command behavior.</li>
            <li>
              GitHub auth for release PR automation via{" "}
              <code className="font-mono">CHANGESETS_GITHUB_TOKEN</code>.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">Troubleshooting</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-[var(--color-bone-muted)]">
            <li>
              <strong>npm 404 on publish:</strong> package ownership/scope or publish target
              mismatch.
            </li>
            <li>
              <strong>No changesets found:</strong> release can still attempt publishing unpublished
              public packages.
            </li>
            <li>
              <strong>Frozen lockfile errors:</strong> run lockfile update after
              dependency/specifier changes before merging.
            </li>
          </ul>
        </section>
      </div>
    </PolicyPageShell>
  );
}
