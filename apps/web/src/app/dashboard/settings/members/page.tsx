"use client";

import { useState } from "react";
import { toast } from "sonner";
import { organization, useActiveOrganization, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  UserX,
  Mail,
  Crown,
  Loader2,
  Clock,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function MemberAvatar({ name, email }: { name?: string | null; email: string }) {
  const initials = name
    ? name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();
  const colors = ["from-indigo-500 to-purple-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500", "from-pink-500 to-rose-500"];
  const color = colors[(email.charCodeAt(0) + email.charCodeAt(1)) % colors.length];
  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-lg`}>
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
    setPending(true);
    try {
      await organization.inviteMember({
        email,
        role,
        organizationId: org.id,
      });
      toast.success(`Invitation sent to ${email}`);
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
        <Button className="bg-white text-black hover:bg-white/90 h-10 px-5 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0f0f11] border-white/10 text-white max-w-md shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <UserPlus className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg">Invite Team Member</DialogTitle>
              <DialogDescription className="text-muted-foreground mt-0.5 text-sm">
                Send a magic link invitation to a new member of your organization.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-5 mt-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 h-11 bg-black/40 border-white/10 text-white placeholder:text-muted-foreground/50 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assign Role</label>
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
                    <Icon className={`w-5 h-5 ${isSelected ? "text-indigo-400" : "text-muted-foreground"}`} />
                    <div>
                      <p className={`text-sm font-semibold ${isSelected ? "text-white" : "text-slate-300"}`}>{config.label}</p>
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
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="hover:bg-white/5 text-muted-foreground">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || !email}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
            >
              {pending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : "Send Invitation"}
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
          className="h-8 w-8 p-0 text-muted-foreground hover:text-white hover:bg-white/10"
          disabled={!!pending}
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-[#141416] border-white/10 text-slate-200 min-w-[180px] shadow-2xl"
      >
        <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold px-3 py-2">
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
        <DropdownMenuSeparator className="bg-white/5" />
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

  const currentUserIsOwner =
    members.find((m) => m.userId === session?.user.id)?.role === "owner";

  async function handleResendInvite(invitationId: string, email: string) {
    setResendingId(invitationId);
    await new Promise((r) => setTimeout(r, 1000)); // simulate resend
    toast.success(`Invite resent to ${email}`);
    setResendingId(null);
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
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">

      {/* Page Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-2">
            Team Members <Users className="w-6 h-6 text-indigo-500" />
          </h3>
          <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Manage who has access to this organization. Owners can invite new members, change roles, and revoke access.
          </p>
        </div>
        {currentUserIsOwner && <InviteMemberDialog />}
      </div>

      {/* Active Members */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">
            Active Members
            <span className="ml-2 text-sm font-normal text-muted-foreground">({members.length})</span>
          </h4>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-xl">
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
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <MemberAvatar name={member.user?.name} email={member.user?.email ?? ""} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate">
                          {member.user?.name ?? member.user?.email}
                        </p>
                        {isSelf && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{member.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <RoleBadge role={member.role} />
                    {currentUserIsOwner && (
                      <MemberActions
                        memberId={member.id}
                        memberEmail={member.user?.email ?? ""}
                        currentRole={member.role}
                        isOwner={isOwner}
                        isSelf={isSelf}
                        orgId={org!.id}
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
      {invitations.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-lg font-semibold text-white">
              Pending Invitations
            </h4>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
              {invitations.length} awaiting
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
            {invitations.map((invite, i) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 border-dashed flex items-center justify-center">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-300 truncate">{invite.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Invite pending</p>
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
                    className="h-8 text-xs text-muted-foreground hover:text-white hover:bg-white/10"
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
