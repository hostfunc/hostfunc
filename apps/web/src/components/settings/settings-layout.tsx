import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";

export interface SettingsNavItem {
  title: string;
  href: string;
  icon?: LucideIcon;
}

interface SettingsLayoutProps {
  children: React.ReactNode;
  navItems: SettingsNavItem[];
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function SettingsLayout({
  children,
  navItems,
  title,
  description,
  backHref,
  backLabel = "Back",
}: SettingsLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
      <aside className="lg:w-1/4 xl:w-1/5 flex-shrink-0">
        <div className="mb-8">
          {backHref && (
            <Link
              href={backHref}
              className="mb-4 inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 h-4 w-4"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              {backLabel}
            </Link>
          )}
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center justify-start rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-foreground",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 rounded-md bg-muted"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
                <span className="relative z-10 flex items-center">
                  {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 lg:max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
