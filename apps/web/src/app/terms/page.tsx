import Link from "next/link";

import { PolicyPageShell } from "@/components/marketing/policy-page-shell";

export default function TermsPage() {
  return (
    <PolicyPageShell
      eyebrow="Legal"
      title="Terms of Service"
      subtitle="These Terms govern access to and use of hostfunc services, including dashboard, runtime APIs, CLI workflows, and related hosted features."
      effectiveDate="April 2026"
    >
      <div className="space-y-10">
        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">1. Acceptance and eligibility</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            By creating an account or using hostfunc, you agree to these Terms. You represent that you are authorized
            to act for your organization when creating workspaces and inviting members.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">2. Accounts and workspace ownership</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            Account holders are responsible for credentials, API tokens, and actions performed in their workspace.
            Workspace owners control membership, access, and billing settings.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">3. Acceptable use</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-[var(--color-bone-muted)]">
            <li>No unlawful, abusive, malicious, or infringing activity.</li>
            <li>No attempts to bypass security controls, tenant boundaries, or usage limits.</li>
            <li>No use of the service to distribute malware or unauthorized data exfiltration tooling.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">4. User code and content</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            You retain ownership of your function code and content. You grant hostfunc a limited license to host,
            execute, process, and transmit that content solely to operate and improve the service you requested.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">5. Billing and subscriptions</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            Paid plans and usage limits are billed through configured payment processors. You are responsible for
            paying applicable fees and taxes for your workspace usage.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">6. Service status and limitations</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            hostfunc is currently an evolving platform. Features, APIs, and limits may change as the product matures.
            Unless explicitly agreed in writing, no specific uptime or SLA commitment is guaranteed.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">7. Termination and suspension</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            We may suspend or terminate accounts for Terms violations, abuse, or security risk. You may stop using the
            service at any time.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">8. Liability and indemnity</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            To the fullest extent permitted by law, hostfunc is provided as-is and as-available. You agree to
            indemnify hostfunc for claims arising from your use that violates these Terms or applicable law.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold">9. Privacy and security references</h2>
          <p className="mt-3 text-[var(--color-bone-muted)]">
            See our <Link href="/privacy" className="underline">Privacy Policy</Link> and{" "}
            <Link href="/security" className="underline">Security page</Link> for data handling and security posture.
          </p>
        </section>
      </div>
    </PolicyPageShell>
  );
}
