"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { assertDocsContentIntegrity, docsSections } from "@/lib/docs-content";
import { cn } from "@/lib/utils";
import { Hexagon, LayoutDashboard, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  assertDocsContentIntegrity();

  return (
    <div className="min-h-screen bg-[var(--color-ink)] font-sans text-[var(--color-bone)] selection:bg-[var(--color-amber)]/30">
      <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-60" />
      <div className="border-grid pointer-events-none absolute inset-0 opacity-30" />
      {/* Top Docs Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-ink)]/85 backdrop-blur-xl">
        <div className="flex h-16 items-center px-6 lg:px-8 max-w-screen-2xl mx-auto justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group w-max">
              <Hexagon className="h-5 w-5 text-[var(--color-amber)] transition-colors group-hover:text-[var(--color-amber-hover)]" />
              <span className="font-display text-xl tracking-tight text-[var(--color-bone)]">
                hostfunc
              </span>
              <span className="ml-2 hidden rounded-full border border-[var(--color-border)] bg-white/[0.03] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-bone-muted)] sm:block">
                Docs
              </span>
            </Link>

            <div className="hidden md:flex items-center relative ml-4">
              <Search className="absolute left-3 h-4 w-4 text-[var(--color-bone-faint)]" />
              <input
                disabled
                placeholder="Search documentation..."
                className="h-9 w-64 rounded-full border border-[var(--color-border)] bg-[var(--color-ink-elevated)] pl-9 pr-4 text-sm text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--color-amber)] transition-all"
              />
              <kbd className="absolute right-3 hidden h-5 items-center gap-1 rounded border border-[var(--color-border)] bg-white/[0.04] px-1.5 font-mono text-[10px] font-medium text-[var(--color-bone-faint)] sm:inline-flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isPending ? (
              <div className="h-9 w-24 bg-white/5 animate-pulse rounded-full hidden sm:block" />
            ) : session ? (
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="hidden rounded-full text-[var(--color-bone-muted)] hover:bg-white/[0.05] hover:text-[var(--color-bone)] sm:flex"
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                </Link>
              </Button>
            ) : (
              <div className="hidden sm:flex items-center gap-4">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)]"
                >
                  Log in
                </Link>
                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-[var(--color-amber)] px-5 font-bold text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
                >
                  <Link href="/login">Get started</Link>
                </Button>
              </div>
            )}

            <button
              type="button"
              className="text-[var(--color-bone-muted)] hover:text-[var(--color-bone)] lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto flex max-w-screen-2xl items-start lg:px-8">
        {/* Desktop Sidebar Navigation */}
        <aside
          className={cn(
            "fixed top-16 z-30 -ml-2 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto lg:sticky lg:block", 
            "border-r border-[var(--color-border)] bg-[var(--color-ink)] pt-10 pb-8 pr-6",
          )}
        >
          <div className="flex flex-col gap-8">
            {docsSections.map((section) => (
              <div key={section.title}>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--color-bone-faint)]">{section.title}</h4>
                <div className="ml-1 flex flex-col space-y-1 border-l border-[var(--color-border)]">
                  {section.links.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.name}
                        href={link.href}
                        className={cn(
                          "pl-4 py-1.5 text-sm transition-all relative font-medium",
                          isActive
                            ? "rounded-r-lg bg-[var(--color-amber)]/10 text-[var(--color-amber)]"
                            : "rounded-r-lg text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]",
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] rounded-r-full bg-[var(--color-amber)] shadow-[0_0_8px_rgba(255,197,107,0.5)]" />
                        )}
                        {link.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-16 z-50 overflow-y-auto border-b border-[var(--color-border)] bg-[var(--color-ink)]/95 p-6 backdrop-blur-xl lg:hidden">
            <div className="flex flex-col gap-8 pb-10">
              {docsSections.map((section) => (
                <div key={section.title}>
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--color-bone-faint)]">{section.title}</h4>
                  <div className="ml-1 flex flex-col space-y-1 border-l border-[var(--color-border)]">
                    {section.links.map((link) => {
                      const isActive = pathname === link.href;
                      return (
                        <Link
                          key={link.name}
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "pl-4 py-2 text-sm transition-all relative font-medium",
                            isActive
                              ? "rounded-r-lg bg-[var(--color-amber)]/10 text-[var(--color-amber)]"
                              : "text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]",
                          )}
                        >
                          {isActive && (
                            <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] rounded-r-full bg-[var(--color-amber)] shadow-[0_0_8px_rgba(255,197,107,0.5)]" />
                          )}
                          {link.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className="relative min-h-[calc(100vh-4rem)] w-full max-w-4xl px-6 py-12 lg:px-12">{children}</main>
      </div>
    </div>
  );
}