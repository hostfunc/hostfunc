import Link from "next/link";

import { PolicyPageShell } from "@/components/marketing/policy-page-shell";

export default function PrivacyPage() {
  return (
    <PolicyPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="This policy describes what data hostfunc processes, why it is processed, and how users can request access or deletion."
      effectiveDate="April 2026"
    >
      <div className="space-y-10">
        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">1. Data we collect</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-[var(--color-bone-muted)]">
            <li>Account and organization profile data.</li>
            <li>Function metadata, trigger settings, deployment artifacts, and version history.</li>
            <li>Execution telemetry (status, timing, memory, egress) and associated logs.</li>
            <li>Billing/subscription records and payment status metadata.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">2. How we use data</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-[var(--color-bone-muted)]">
            <li>Provide and operate runtime, dashboard, CLI, and API features.</li>
            <li>Secure the service, enforce limits, and detect abuse.</li>
            <li>Support billing, support operations, and reliability monitoring.</li>
            <li>Maintain and improve service quality.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">3. Processors and sharing</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            hostfunc uses infrastructure and service providers (for hosting/runtime, databases, authentication, and
            billing) to deliver the product. We do not sell personal data.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">4. Data retention</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            We retain operational and account data for as long as needed to provide the service and satisfy legal,
            security, and billing obligations. Specific retention windows may evolve as platform policies mature.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">5. Security measures</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            We apply layered controls including authenticated machine routes, secret protection, and runtime/network
            safeguards. See the <Link href="/security" className="underline">Security page</Link> for current control
            summaries and disclosure guidance.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">6. Your rights and requests</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            You can request access, correction, export, or deletion of personal data associated with your account,
            subject to legal and operational constraints.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">7. International processing and policy changes</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            Data may be processed in regions where our providers operate. We may update this policy as product and
            legal requirements evolve; material updates will include a revised effective date.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">8. Related terms</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            Use of hostfunc is also governed by our <Link href="/terms" className="underline">Terms of Service</Link>.
          </p>
        </section>
      </div>
    </PolicyPageShell>
  );
}
