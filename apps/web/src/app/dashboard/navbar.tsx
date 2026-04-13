"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  Activity,
  ChevronDown,
  Hexagon,
  Layers,
  LogOut,
  Plus,
  Settings,
  User,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function DashboardNavbar({
  user,
}: { user: { id: string; email: string; name?: string | null } }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const navLinks = [
    { name: "Overview", href: "/dashboard", icon: Activity, exact: true },
    { name: "Functions", href: "/dashboard/functions", icon: Layers },
  ];

  return (
    <header className="border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Left Side: Brand & Workspaces */}
        <div className="flex items-center gap-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 pl-2 pr-3 px-2 h-9 py-1"
                size="sm"
              >
                <div className="bg-primary/20 p-1 rounded-md text-primary">
                  <Hexagon className="w-4 h-4 fill-primary/20" />
                </div>
                <span className="font-semibold text-sm">Personal</span>
                <span className="text-muted-foreground text-xs bg-muted px-1.5 py-0.5 rounded-sm">
                  /
                </span>
                <span className="font-semibold text-sm">hostfunc</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Active Workspace
              </DropdownMenuLabel>
              <DropdownMenuItem className="font-medium gap-2">
                <div className="bg-primary/20 p-1 rounded-md text-primary h-6 w-6 flex items-center justify-center">
                  <Hexagon className="w-3 h-3 fill-primary/20" />
                </div>
                hostfunc
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="text-muted-foreground gap-2 cursor-pointer">
                <Link href="/new-workspace" className="w-full">
                  <Plus className="w-4 h-4" /> Create Workspace
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Center: Main Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 ml-4">
            {navLinks.map((link) => {
              const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);

              const Icon = link.icon;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors px-3 py-1.5 rounded-md relative",
                    isActive
                      ? "text-foreground bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                  {isActive && (
                    <div className="absolute -bottom-[15px] left-2 right-2 h-[2px] bg-primary rounded-t-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Actions & Profile */}
        <div className="flex items-center gap-3">
          <Button size="sm" asChild className="h-8 shadow-sm group">
            <Link href="/dashboard/new">
              <Zap className="mr-1.5 size-3.5 group-hover:scale-110 transition-transform text-white" />
              New System
            </Link>
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full border border-border bg-muted/20 outline-none focus-visible:ring-1"
              >
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal border-b pb-3 mb-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.name || "System Administrator"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground mt-1">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard/settings" className="w-full flex items-center">
                    <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Account Settings</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
