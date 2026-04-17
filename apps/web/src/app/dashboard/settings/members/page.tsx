"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { organization, useActiveOrganization, useSession } from "@/lib/auth-client";
import { hasOrgPermission } from "@/lib/permissions";
import { useState } from "react";
import { toast } from "sonner";
import { resendInvitationEmail } from "./actions";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  Crown,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";

type Role = "admin" | "member";

const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    icon: Crown,
    className: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    className: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  },
  member: {
    label: "Member",
    icon: Shield,
    className: "bg-white/5 text-slate-400 border border-white/10",
  },
} as const;

function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.member;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function MemberAvatar({ name, email }: { name?: string | null; email: string }) {
  const initials = name
    ? name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : email.slice(0, 2).toUpperCase();
  const colors = [
    "from-indigo-500 to-purple-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-pink-500 to-rose-500",
  ];
  const color = colors[(email.charCodeAt(0) + email.charCodeAt(1)) % colors.length];
  return (
    <div
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-lg`}
    >
      <span className="text-sm font-bold text-white">{initials}</span>
    </div>
  );
}

function InviteMemberDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [pending, setPending] = useState(false);
  const { data: org } = useActiveOrganization();

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!org?.id) return;
    const normalizedEmail = email.trim().toLowerCase();
    const hasPendingInvite = (org.invitations ?? []).some(
      (invite) => invite.status === "pending" && invite.email.toLowerCase() === normalizedEmail,
    );
    if (hasPendingInvite) {
      toast.error("A pending invitation already exists for this email.");
      return;
    }
    setPending(true);
    try {
      await organization.inviteMember({
        email: normalizedEmail,
        role,
        organizationId: org.id,
      });
      toast.success(`Invitation sent to ${normalizedEmail}`);
      setEmail("");
      setRole("member");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] transition-all hover:bg-[var(--color-amber-hover)]">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-[var(--color-border)] bg-[var(--color-ink-elevated)] text-[var(--color-bone)] shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <UserPlus className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-lg text-[var(--color-bone)]">
                Invite Team Member
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm text-[var(--color-bone-muted)]">
                Send a magic link invitation to a new member of your organization.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-5 mt-2">
          <div className="space-y-2">
            <label
              htmlFor="invite-email"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 border-[var(--color-border)] bg-black/30 pl-10 text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)] focus-visible:border-[var(--color-amber)] focus-visible:ring-[var(--color-amber)]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assign Role
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["member", "admin"] as Role[]).map((r) => {
                const config = ROLE_CONFIG[r];
                const Icon = config.icon;
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-indigo-500/50 bg-indigo-500/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${isSelected ? "text-indigo-400" : "text-muted-foreground"}`}
                    />
                    <div>
                      <p
                        className={`text-sm font-semibold ${isSelected ? "text-white" : "text-slate-300"}`}
                      >
                        {config.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {r === "admin" ? "Full workspace access" : "Standard access"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="mt-6 gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-[var(--color-bone-muted)] hover:bg-white/[0.04]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || !email}
              className="bg-[var(--color-amber)] px-6 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberActions({
  memberId,
  memberEmail,
  currentRole,
  isOwner,
  isSelf,
  orgId,
  onUpdate,
}: {
  memberId: string;
  memberEmail: string;
  currentRole: string;
  isOwner: boolean;
  isSelf: boolean;
  orgId: string;
  onUpdate: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);

  if (isOwner || isSelf) return null;

  async function handleRoleChange(newRole: Role) {
    setPending("role");
    try {
      await organization.updateMemberRole({ memberId, role: newRole, organizationId: orgId });
      toast.success(`Role updated to ${newRole}`);
      onUpdate();
    } catch {
      toast.error("Failed to update role");
    } finally {
      setPending(null);
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove ${memberEmail} from the organization?`)) return;
    setPending("remove");
    try {
      await organization.removeMember({ memberIdOrEmail: memberId, organizationId: orgId });
      toast.success(`${memberEmail} has been removed`);
      onUpdate();
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setPending(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-[var(--color-bone-faint)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
          disabled={!!pending}
        >
          {pending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MoreHorizontal className="w-4 h-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[180px] border-[var(--color-border)] bg-[var(--color-ink-elevated)] text-[var(--color-bone)] shadow-2xl"
      >
        <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-bone-faint)]">
          Change Role
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleRoleChange("admin")}
          disabled={currentRole === "admin"}
          className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5"
        >
          <ShieldCheck className="w-4 h-4 text-indigo-400" /> Promote to Admin
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleRoleChange("member")}
          disabled={currentRole === "member"}
          className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5"
        >
          <Shield className="w-4 h-4 text-slate-400" /> Set as Member
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[var(--color-border)]" />
        <DropdownMenuItem
          onClick={handleRemove}
          className="gap-2 cursor-pointer text-red-400 hover:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400"
        >
          <UserX className="w-4 h-4" /> Revoke Access
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function MembersOrgSettingsPage() {
  const { data: org, refetch } = useActiveOrganization();
  const { data: session } = useSession();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const members = org?.members ?? [];
  const invitations = org?.invitations?.filter((i) => i.status === "pending") ?? [];

  const currentUserRole = members.find((m) => m.userId === session?.user.id)?.role;
  const canManageMembers = hasOrgPermission(currentUserRole, "manage_members");

  async function handleResendInvite(invitationId: string, email: string) {
    setResendingId(invitationId);
    try {
      await resendInvitationEmail(invitationId);
      toast.success(`Invite resent to ${email}`);
    } catch {
      toast.error("Failed to resend invitation");
    } finally {
      setResendingId(null);
    }
  }

  async function handleCancelInvite(invitationId: string) {
    try {
      await organization.cancelInvitation({ invitationId });
      toast.success("Invitation cancelled");
      refetch();
    } catch {
      toast.error("Failed to cancel invitation");
    }
  }

  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Team Members <Users className="h-6 w-6 text-[var(--color-amber)]" />
          </h3>
          <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-bone-muted)]">
            Manage who has access to this organization. Owners and admins can invite new members,
            change roles, and revoke access.
          </p>
        </div>
        {canManageMembers && <InviteMemberDialog />}
      </div>

      {/* Active Members */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-[var(--color-bone)]">
            Active Members
            <span className="ml-2 text-sm font-normal text-[var(--color-bone-faint)]">
              ({members.length})
            </span>
          </h4>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 shadow-xl">
          <AnimatePresence>
            {members.map((member, i) => {
              const isSelf = member.userId === session?.user.id;
              const isOwner = member.role === "owner";
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 transition-colors hover:bg-white/[0.03] last:border-0"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <MemberAvatar name={member.user?.name} email={member.user?.email ?? ""} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="truncate text-sm font-semibold text-[var(--color-bone)]">
                          {member.user?.name ?? member.user?.email}
                        </p>
                        {isSelf && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--color-bone-faint)]">
                        {member.user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <RoleBadge role={member.role} />
                    {canManageMembers && (
                      <MemberActions
                        memberId={member.id}
                        memberEmail={member.user?.email ?? ""}
                        currentRole={member.role}
                        isOwner={isOwner}
                        isSelf={isSelf}
                        orgId={org?.id ?? ""}
                        onUpdate={() => refetch()}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </section>

      {/* Pending Invitations */}
      {canManageMembers && invitations.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-lg font-semibold text-[var(--color-bone)]">Pending Invitations</h4>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
              {invitations.length} awaiting
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70">
            {invitations.map((invite, i) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 transition-colors hover:bg-white/[0.03] last:border-0"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 border-dashed flex items-center justify-center">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-bone)]">
                      {invite.email}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-[var(--color-bone-faint)]">Invite pending</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium capitalize">
                    {invite.role}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResendInvite(invite.id, invite.email)}
                    disabled={resendingId === invite.id}
                    className="h-8 text-xs text-[var(--color-bone-muted)] hover:bg-white/[0.05] hover:text-[var(--color-bone)]"
                  >
                    {resendingId === invite.id ? (
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1.5" />
                    )}
                    Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelInvite(invite.id)}
                    className="h-8 text-xs text-red-500/70 hover:text-red-500 hover:bg-red-500/10"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
