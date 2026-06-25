"use client";

import { Logo } from "@/components/brand/logo";
import { MobileNav } from "@/components/marketing/mobile-nav";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { marketingContent } from "@/lib/marketing-content";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const GITHUB_HREF = "https://github.com/hostfunc/hostfunc";

/**
 * The marketing navbar, shared across every public page (homepage, the static
 * content shells, the marketplace/connectors pages, and the policy pages). A
 * client island so it can read the session and show the right CTA — Next still
 * SSRs it, so the nav links stay in the initial HTML and wrapped page bodies
 * remain server components. The hamburger ({@link MobileNav}) is the only way to
 * reach the nav links on small screens, where the desktop nav is hidden.
 */
export function SiteHeader() {
  const { data: session, isPending } = useSession();
  const isLoggedIn = Boolean(session);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-ink)]/85 backdrop-blur-xl">
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo wordmarkClassName="text-xl" />
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {marketingContent.navLinks.map((link) => {
            const external = link.label === "Docs";
            return (
              <Link
                key={link.label}
                href={link.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="text-sm text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)]"
              >
                <span className="inline-flex items-center gap-1">
                  {link.label}
                  {external ? <ArrowUpRight className="size-3.5" /> : null}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          {isPending ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-white/5" />
          ) : isLoggedIn ? (
            <Button
              asChild
              size="sm"
              className="rounded-full bg-[var(--color-bone)] px-5 font-medium text-[var(--color-ink)] hover:bg-white"
            >
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)] sm:inline"
              >
                Sign in
              </Link>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-[var(--color-amber)] px-5 font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
              >
                <Link href="/login">Get started</Link>
              </Button>
            </>
          )}
          <Button
            asChild
            size="icon"
            variant="outline"
            className="size-9 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
          >
            <Link
              href={GITHUB_HREF}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open GitHub repository"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
                <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56l-.01-1.98c-3.2.7-3.88-1.37-3.88-1.37-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.15.08 1.76 1.2 1.76 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.72-1.53-2.56-.3-5.24-1.28-5.24-5.7 0-1.26.45-2.3 1.2-3.1-.12-.3-.52-1.5.11-3.12 0 0 .98-.32 3.2 1.19a10.9 10.9 0 0 1 5.82 0c2.22-1.5 3.2-1.19 3.2-1.19.63 1.62.23 2.82.11 3.12.75.8 1.2 1.84 1.2 3.1 0 4.43-2.69 5.4-5.26 5.69.41.36.78 1.08.78 2.18l-.01 3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
              </svg>
            </Link>
          </Button>
          <MobileNav
            navLinks={marketingContent.navLinks}
            isLoggedIn={isLoggedIn}
            primaryHref="/login"
          />
        </div>
      </div>
    </header>
  );
}
