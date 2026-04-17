"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Crown,
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
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getWorkspaceCreationEligibilityAction } from "../new-workspace/actions";
import { switchActiveOrganization } from "./org-actions";

function getWorkspaceSwitchTarget(pathname: string | null): string {
  if (!pathname?.startsWith("/dashboard")) {
    return "/dashboard";
  }

  if (
    pathname === "/dashboard" ||
    pathname === "/dashboard/functions" ||
    pathname.startsWith("/dashboard/settings")
  ) {
    return pathname;
  }

  return "/dashboard";
}

export function DashboardNavbar({
  user,
  organizations,
  activeOrganizationId,
}: {
  user: { id: string; email: string; name?: string | null };
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    ownerName: string;
    isShared: boolean;
  }>;
  activeOrganizationId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSwitching, startSwitchTransition] = useTransition();
  const [isCheckingWorkspace, startWorkspaceCheckTransition] = useTransition();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"workspaces" | "quotas">("workspaces");
  const activeOrg =
    organizations.find((organization) => organization.id === activeOrganizationId) ??
    organizations[0];

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const handleSwitchWorkspace = (organizationId: string) => {
    if (!organizationId || organizationId === activeOrganizationId) return;
    startSwitchTransition(async () => {
      try {
        const nextPath = getWorkspaceSwitchTarget(pathname);
        await switchActiveOrganization(organizationId);
        window.location.assign(nextPath);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to switch workspace");
      }
    });
  };

  const handleCreateWorkflowClick = () => {
    startWorkspaceCheckTransition(async () => {
      try {
        const eligibility = await getWorkspaceCreationEligibilityAction();
        if (eligibility.allowed) {
          router.push("/new-workspace");
          return;
        }
        setUpgradeReason("workspaces");
        setShowUpgradeModal(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to verify workspace limits");
      }
    });
  };

  useEffect(() => {
    const onQuotaEvent = () => {
      setUpgradeReason("quotas");
      setShowUpgradeModal(true);
    };
    window.addEventListener("hostfunc:open-upgrade-modal", onQuotaEvent);
    return () => window.removeEventListener("hostfunc:open-upgrade-modal", onQuotaEvent);
  }, []);

  const navLinks = [
    { name: "Overview", href: "/dashboard", icon: Activity, exact: true },
    { name: "Functions", href: "/dashboard/functions", icon: Layers },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-ink)]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Left Side: Brand & Workspaces */}
        <div className="flex items-center gap-6">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-9 items-center gap-2 px-2 pl-2 pr-3 text-[var(--color-bone)] hover:bg-white/[0.05] hover:text-[var(--color-bone)]"
                size="sm"
              >
                <div className="rounded-md bg-[var(--color-amber)]/20 p-1 text-[var(--color-amber)]">
                  <Hexagon className="h-4 w-4 fill-[var(--color-amber)]/20" />
                </div>
                <span className="font-semibold text-sm">{activeOrg?.name ?? "Workspace"}</span>
                <span className="rounded-sm bg-white/[0.05] px-1.5 py-0.5 text-xs text-[var(--color-bone-faint)]">
                  /
                </span>
                <span className="font-semibold text-sm">{activeOrg?.slug ?? "loading"}</span>
                {activeOrg?.isShared ? (
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                    Shared
                  </span>
                ) : null}
                <ChevronDown className="ml-1 h-3 w-3 text-[var(--color-bone-faint)]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[220px] border-[var(--color-border)] bg-[var(--color-ink-elevated)] text-[var(--color-bone)]"
            >
              <DropdownMenuLabel className="text-xs font-normal text-[var(--color-bone-faint)]">
                Active Workspace
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {organizations.map((organization) => (
                  <DropdownMenuItem
                    key={organization.id}
                    className={cn(
                      "font-medium gap-2 cursor-pointer",
                      organization.id === activeOrganizationId && "bg-[var(--color-amber)]/10",
                    )}
                    onClick={() => handleSwitchWorkspace(organization.id)}
                    disabled={isSwitching}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-amber)]/15 p-1 text-[var(--color-amber)]">
                      <Hexagon className="h-3 w-3 fill-[var(--color-amber)]/20" />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{organization.ownerName}</span>
                        {organization.isShared ? (
                          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-300">
                            Shared
                          </span>
                        ) : null}
                      </div>
                      <span className="truncate text-xs text-muted-foreground">
                        {organization.slug}
                        {organization.isShared ? ` · ${organization.name}` : ""}
                      </span>
                    </div>
                    {organization.isShared ? (
                      <BadgeCheck className="ml-auto h-3.5 w-3.5 text-emerald-300" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-[var(--color-bone-muted)]"
                onClick={handleCreateWorkflowClick}
                disabled={isCheckingWorkspace}
              >
                <Plus className="h-4 w-4" />{" "}
                {isCheckingWorkspace ? "Checking plan..." : "Create Workspace"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Center: Main Navigation */}
          <nav className="ml-4 hidden items-center gap-1.5 md:flex">
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
                      ? "bg-[var(--color-amber)]/12 text-[var(--color-bone)]"
                      : "text-[var(--color-bone-muted)] hover:bg-white/[0.05] hover:text-[var(--color-bone)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                  {isActive && (
                    <div className="absolute -bottom-[15px] left-2 right-2 h-[2px] rounded-t-full bg-[var(--color-amber)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Actions & Profile */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            asChild
            className="group h-8 rounded-full bg-[var(--color-amber)] px-4 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
          >
            <Link href="/dashboard/new">
              <Zap className="mr-1.5 size-3.5 text-[var(--color-ink)] transition-transform group-hover:scale-110" />
              New System
            </Link>
          </Button>

          <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full border border-[var(--color-border)] bg-white/[0.03] text-[var(--color-bone)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-amber)]"
              >
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 border-[var(--color-border)] bg-[var(--color-ink-elevated)] text-[var(--color-bone)]"
              align="end"
              forceMount
            >
              <DropdownMenuLabel className="mb-2 border-b border-[var(--color-border)] pb-3 font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.name || "System Administrator"}
                  </p>
                  <p className="mt-1 text-xs leading-none text-[var(--color-bone-faint)]">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard/settings" className="w-full flex items-center">
                    <Settings className="mr-2 h-4 w-4 text-[var(--color-bone-faint)]" />
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
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent
          showCloseButton={false}
          className="max-w-xl border-[var(--color-border)] bg-[var(--color-ink-elevated)] text-[var(--color-bone)] shadow-[0_25px_80px_rgba(0,0,0,0.65)]"
        >
          <DialogHeader className="text-left">
            <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/12 px-3 py-1 text-xs uppercase tracking-widest text-[var(--color-amber)]">
              <Crown className="size-3.5" />
              {upgradeReason === "quotas" ? "Usage limit reached" : "Upgrade to scale"}
            </div>
            <DialogTitle className="font-display text-3xl tracking-tight text-[var(--color-bone)]">
              {upgradeReason === "quotas" ? "Unlock higher usage limits" : "Unlock more workspaces"}
            </DialogTitle>
            <DialogDescription className="max-w-lg text-[var(--color-bone-muted)]">
              {upgradeReason === "quotas"
                ? "This workspace reached a free-tier execution quota. Upgrade to Pro or Team to continue running and deploying at higher limits."
                : "Free tier includes one workspace. Upgrade to Pro for up to 3 workspaces, or Team for unlimited workspaces and higher execution capacity."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 rounded-2xl border border-[var(--color-border)] bg-black/20 p-4 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border)] bg-white/[0.02] p-3">
              <p className="text-xs uppercase tracking-wider text-[var(--color-bone-faint)]">Pro</p>
              <p className="mt-1 font-semibold text-[var(--color-bone)]">Up to 3 workspaces</p>
              <p className="mt-1 text-xs text-[var(--color-bone-muted)]">
                2M executions/day, larger runtime limits.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 p-3">
              <p className="text-xs uppercase tracking-wider text-[var(--color-amber)]">Team</p>
              <p className="mt-1 font-semibold text-[var(--color-bone)]">Unlimited workspaces</p>
              <p className="mt-1 text-xs text-[var(--color-bone-muted)]">
                20M executions/day and team-scale capacity.
              </p>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              className="rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
              onClick={() => setShowUpgradeModal(false)}
            >
              Maybe later
            </Button>
            <Button
              asChild
              className="rounded-full bg-[var(--color-amber)] px-6 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            >
              <Link href="/dashboard/settings/billing" onClick={() => setShowUpgradeModal(false)}>
                View plans
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
