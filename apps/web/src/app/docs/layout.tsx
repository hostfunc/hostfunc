"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hexagon, LayoutDashboard, Search, Menu, X } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const DOCS_NAV = [
  {
    title: "Getting Started",
    links: [
      { name: "Introduction", href: "/docs" },
      { name: "Quickstart", href: "#" },
      { name: "Deployment", href: "#" },
    ],
  },
  {
    title: "Core Concepts",
    links: [
      { name: "Functions (TS)", href: "#" },
      { name: "Environment Secrets", href: "#" },
      { name: "Logging & Traces", href: "#" },
    ],
  },
  {
    title: "Triggers",
    links: [
      { name: "HTTP Endpoints", href: "#" },
      { name: "Webhooks", href: "#" },
      { name: "Cron Scheduling", href: "#" },
    ],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200">
      
      {/* Top Docs Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#050505]/80 backdrop-blur-xl">
        <div className="flex h-16 items-center px-6 lg:px-8 max-w-screen-2xl mx-auto justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group w-max">
              <div className="bg-primary/20 p-1.5 rounded-lg text-primary transition-transform group-hover:scale-110 duration-300">
                <Hexagon className="w-4 h-4 fill-primary/20" />
              </div>
              <span className="font-mono text-lg font-bold tracking-tight text-white">hostfunc</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground ml-2 hidden sm:block">Docs</span>
            </Link>
            
            <div className="hidden md:flex items-center relative ml-4">
               <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
               <input 
                 disabled 
                 placeholder="Search documentation..." 
                 className="h-9 w-64 rounded-full border border-white/10 bg-white/5 pl-9 pr-4 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
               />
               <kbd className="absolute right-3 hidden sm:inline-flex h-5 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
               </kbd>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {isPending ? (
              <div className="h-9 w-24 bg-white/5 animate-pulse rounded-full hidden sm:block" />
            ) : session ? (
              <Button asChild size="sm" variant="ghost" className="text-muted-foreground hover:text-white hidden sm:flex">
                <Link href="/dashboard"><LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard</Link>
              </Button>
            ) : (
              <div className="hidden sm:flex items-center gap-4">
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                  Log in
                </Link>
                <Button asChild size="sm" className="bg-white text-black hover:bg-white/90 rounded-full px-5">
                  <Link href="/login">Get started</Link>
                </Button>
              </div>
            )}
            
            <button 
              className="lg:hidden text-white" 
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
        <aside className={cn(
          "fixed top-16 z-30 -ml-2 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto lg:sticky lg:block", // Standard display logic
          "border-r border-white/5 bg-[#050505] pt-10 pb-8 pr-6" // Branding
        )}>
          <div className="flex flex-col gap-8">
            {DOCS_NAV.map((section, idx) => (
              <div key={idx}>
                <h4 className="mb-3 font-semibold text-white tracking-tight">{section.title}</h4>
                <div className="flex flex-col space-y-1 border-l border-white/10 ml-1">
                  {section.links.map((link, j) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={j}
                        href={link.href}
                        className={cn(
                          "pl-4 py-1.5 text-sm transition-all relative",
                          isActive 
                            ? "text-primary font-medium" 
                            : "text-muted-foreground hover:text-white"
                        )}
                      >
                        {isActive && (
                           <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-primary rounded-r-full" />
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
           <div className="fixed inset-0 top-16 z-50 bg-[#050505] p-6 lg:hidden overflow-y-auto border-b border-white/10">
              <div className="flex flex-col gap-8 pb-10">
                {DOCS_NAV.map((section, idx) => (
                  <div key={idx}>
                    <h4 className="mb-3 font-semibold text-white tracking-tight">{section.title}</h4>
                    <div className="flex flex-col space-y-1 border-l border-white/10 ml-1">
                      {section.links.map((link, j) => {
                        const isActive = pathname === link.href;
                        return (
                          <Link
                            key={j}
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "pl-4 py-1.5 text-sm transition-all relative",
                              isActive 
                                ? "text-primary font-medium" 
                                : "text-muted-foreground hover:text-white"
                            )}
                          >
                            {isActive && (
                               <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-primary rounded-r-full" />
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
        <main className="relative py-10 px-6 lg:px-10 max-w-4xl w-full">
          {children}
        </main>

      </div>
    </div>
  );
}
