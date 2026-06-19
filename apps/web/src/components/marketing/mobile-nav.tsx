"use client";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import type { MarketingContent } from "@/lib/marketing-content";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";

interface Props {
  navLinks: MarketingContent["navLinks"];
  isLoggedIn: boolean;
  /** Where the primary CTA points — "/dashboard" when signed in, "/login" otherwise. */
  primaryHref: string;
}

const GITHUB_HREF = "https://github.com/hostfunc/hostfunc";

export function MobileNav({ navLinks, isLoggedIn, primaryHref }: Props) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const close = () => setOpen(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          size="icon"
          variant="outline"
          aria-label="Open menu"
          className="size-9 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)] md:hidden"
        >
          <Menu className="size-4" />
        </Button>
      </DialogPrimitive.Trigger>

      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-[var(--color-ink)]/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild aria-label="Site menu" aria-describedby={undefined}>
              <motion.div
                className="fixed inset-0 z-50 flex h-dvh w-full flex-col bg-[var(--color-ink)] outline-none"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]" />

                <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>

                {/* Top bar mirrors the header */}
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
                  <Link href="/" onClick={close} className="flex items-center gap-2">
                    <Logo wordmarkClassName="text-xl" />
                  </Link>
                  <DialogPrimitive.Close asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Close menu"
                      className="size-9 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                    >
                      <X className="size-4" />
                    </Button>
                  </DialogPrimitive.Close>
                </div>

                {/* Links */}
                <nav className="flex flex-1 flex-col px-6 pt-4">
                  {navLinks.map((link, index) => {
                    const isDocs = link.label === "Docs";
                    return (
                      <motion.div
                        key={link.label}
                        initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: reduceMotion ? 0 : 0.06 * index + 0.05,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      >
                        <Link
                          href={link.href}
                          onClick={close}
                          target={isDocs ? "_blank" : undefined}
                          rel={isDocs ? "noopener noreferrer" : undefined}
                          className="flex items-center justify-between border-b border-[var(--color-border)] py-4 font-display text-3xl tracking-tight text-[var(--color-bone)] transition-colors hover:text-[var(--color-amber)]"
                        >
                          {link.label}
                          {isDocs ? (
                            <ArrowUpRight className="size-6 text-[var(--color-bone-faint)]" />
                          ) : null}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                {/* Footer CTAs */}
                <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-6 py-6">
                  {isLoggedIn ? (
                    <Button
                      asChild
                      size="lg"
                      className="h-12 rounded-full bg-[var(--color-bone)] font-medium text-[var(--color-ink)] hover:bg-white"
                    >
                      <Link href="/dashboard" onClick={close}>
                        Dashboard
                        <ArrowRight className="ml-1 size-4" />
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button
                        asChild
                        size="lg"
                        className="h-12 rounded-full bg-[var(--color-amber)] font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
                      >
                        <Link href={primaryHref} onClick={close}>
                          Get started
                          <ArrowRight className="ml-1 size-4" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        size="lg"
                        variant="ghost"
                        className="h-12 rounded-full text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
                      >
                        <Link href="/login" onClick={close}>
                          Sign in
                        </Link>
                      </Button>
                    </>
                  )}
                  <Link
                    href={GITHUB_HREF}
                    onClick={close}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center justify-center gap-2 text-sm text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)]"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
                      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56l-.01-1.98c-3.2.7-3.88-1.37-3.88-1.37-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.15.08 1.76 1.2 1.76 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.72-1.53-2.56-.3-5.24-1.28-5.24-5.7 0-1.26.45-2.3 1.2-3.1-.12-.3-.52-1.5.11-3.12 0 0 .98-.32 3.2 1.19a10.9 10.9 0 0 1 5.82 0c2.22-1.5 3.2-1.19 3.2-1.19.63 1.62.23 2.82.11 3.12.75.8 1.2 1.84 1.2 3.1 0 4.43-2.69 5.4-5.26 5.69.41.36.78 1.08.78 2.18l-.01 3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                    </svg>
                    View on GitHub
                  </Link>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
