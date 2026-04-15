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
    <div className="min-h-screen bg-[#09090b] text-slate-200 selection:bg-cyan-500/30 font-sans">
      {/* Top Docs Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md">
        <div className="flex h-16 items-center px-6 lg:px-8 max-w-screen-2xl mx-auto justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group w-max">
              <Hexagon className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              <span className="font-bold text-xl tracking-tight text-white">
                hostfunc
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 ml-2 hidden sm:block">
                Docs
              </span>
            </Link>

            <div className="hidden md:flex items-center relative ml-4">
              <Search className="w-4 h-4 absolute left-3 text-slate-500" />
              <input
                disabled
                placeholder="Search documentation..."
                className="h-9 w-64 rounded-full border border-white/10 bg-black/50 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
              />
              <kbd className="absolute right-3 hidden sm:inline-flex h-5 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-slate-400">
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
                className="text-slate-400 hover:text-white hover:bg-white/5 hidden sm:flex rounded-full"
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                </Link>
              </Button>
            ) : (
              <div className="hidden sm:flex items-center gap-4">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Log in
                </Link>
                <Button
                  asChild
                  size="sm"
                  className="bg-white text-black hover:bg-slate-200 rounded-full px-5 font-bold"
                >
                  <Link href="/login">Get started</Link>
                </Button>
              </div>
            )}

            <button
              type="button"
              className="lg:hidden text-slate-300 hover:text-white"
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
            "border-r border-white/5 bg-[#09090b] pt-10 pb-8 pr-6", 
          )}
        >
          <div className="flex flex-col gap-8">
            {docsSections.map((section) => (
              <div key={section.title}>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">{section.title}</h4>
                <div className="flex flex-col space-y-1 border-l border-white/10 ml-1">
                  {section.links.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.name}
                        href={link.href}
                        className={cn(
                          "pl-4 py-1.5 text-sm transition-all relative font-medium",
                          isActive
                            ? "text-cyan-400 bg-cyan-500/5 rounded-r-lg"
                            : "text-slate-400 hover:text-white hover:bg-white/5 rounded-r-lg",
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-cyan-400 rounded-r-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
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
          <div className="fixed inset-0 top-16 z-50 bg-[#09090b]/95 backdrop-blur-xl p-6 lg:hidden overflow-y-auto border-b border-white/5">
            <div className="flex flex-col gap-8 pb-10">
              {docsSections.map((section) => (
                <div key={section.title}>
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">{section.title}</h4>
                  <div className="flex flex-col space-y-1 border-l border-white/10 ml-1">
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
                              ? "text-cyan-400 bg-cyan-500/5 rounded-r-lg"
                              : "text-slate-400 hover:text-white",
                          )}
                        >
                          {isActive && (
                            <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-cyan-400 rounded-r-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
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
        <main className="relative py-12 px-6 lg:px-12 max-w-4xl w-full min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}