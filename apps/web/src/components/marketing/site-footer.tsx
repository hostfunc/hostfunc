import { BrandName } from "@/components/brand/brand-name";
import { Logo } from "@/components/brand/logo";
import { marketingContent } from "@/lib/marketing-content";
import Link from "next/link";

/**
 * Server-rendered marketing footer shared across every public page. The link
 * list is the internal link graph Google uses to discover and weight pages, so
 * it stays static and crawlable — every marketing route renders it.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[#070706] py-12">
      <div className="w-full px-6">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <Logo tone="muted" wordmarkClassName="text-lg text-[var(--color-bone-muted)]" />
            <span className="ml-3 text-xs text-[var(--color-bone-faint)]">
              © {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-7 gap-y-2 text-sm">
            {marketingContent.footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-8 max-w-md text-xs leading-relaxed text-[var(--color-bone-faint)]">
          <BrandName text={marketingContent.footerNote} />
        </p>
      </div>
    </footer>
  );
}
