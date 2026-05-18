import { PolicyPageShell } from "@/components/marketing/policy-page-shell";

export default function SecurityPage() {
  return (
    <PolicyPageShell
      eyebrow="Security"
      title="Security at hostfunc"
      subtitle="hostfunc uses secure-by-default architecture for auth, execution boundaries, and secret handling. This page summarizes controls that are currently in place."
      effectiveDate="April 2026"
    >
      <div className="space-y-10">
        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">Security principles</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-[var(--color-bone-muted)]">
            <li>Least privilege for machine routes and internal control-plane calls.</li>
            <li>Secure defaults (authenticated trigger execution paths and token verification).</li>
            <li>Tenant isolation controls around function execution and org-scoped access.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">Current controls</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-[var(--color-bone-muted)]">
            <li>Token-authenticated machine APIs for CLI, MCP, and internal service routes.</li>
            <li>Internal invoke tokens for trusted control-plane to runtime dispatch paths.</li>
            <li>Outbound worker SSRF controls including private-network target blocking.</li>
            <li>Secret storage with encrypted values and controlled retrieval at runtime.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">Operational security</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            We run key internal token rotation and secret-management procedures through production
            runbooks. Logging and execution telemetry are designed for observability while
            minimizing sensitive value exposure.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">Known limitations</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-[var(--color-bone-muted)]">
            <li>
              Token permissions are org-scoped; route/action-level scopes are a planned improvement.
            </li>
            <li>Some rotation and cutover workflows are still operationally manual.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">Report a vulnerability</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            Please follow the project disclosure process documented in{" "}
            <code className="font-mono">SECURITY.md</code>.
          </p>
        </section>
      </div>
    </PolicyPageShell>
  );
}
