import Link from "next/link";
import type { ReactNode } from "react";

type PolicyPageShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  effectiveDate?: string;
  children: ReactNode;
};

export function PolicyPageShell({
  eyebrow,
  title,
  subtitle,
  effectiveDate,
  children,
}: PolicyPageShellProps) {
  return (
    <main className="min-h-screen bg-[var(--color-ink)] text-[var(--color-bone)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-ink)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]">
            Back to hostfunc
          </Link>
          <Link href="/docs" className="text-sm text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]">
            Docs
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-amber)]">{eyebrow}</p>
        <h1 className="mt-3 text-balance font-display text-4xl text-[var(--color-bone)] md:text-6xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-pretty text-base leading-relaxed text-[var(--color-bone-muted)]">
          {subtitle}
        </p>
        {effectiveDate ? (
          <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[var(--color-bone-faint)]">
            Effective date: {effectiveDate}
          </p>
        ) : null}
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">{children}</section>
    </main>
  );
}
