"use client";

import { CopyButton } from "@/app/dashboard/functions/copy-button";
import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings/settings-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DcvRecord, InboundEmailRecord } from "@hostfunc/db";
import {
  ArrowUpRight,
  CheckCircle2,
  Globe,
  Loader2,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { type ProvisionedDomain, addDomainAction, removeDomainAction } from "./actions";

type DomainStatus = ProvisionedDomain["status"];

interface DomainRow {
  id: string;
  hostname: string;
  status: DomainStatus;
  sslStatus: string | null;
  dcvRecords: DcvRecord[];
  ownershipVerification: DcvRecord | null;
  lastError: string | null;
  fnSlug: string;
  resendDomainId: string | null;
  emailStatus: string | null;
  emailRecords: InboundEmailRecord[];
}

interface Website {
  id: string;
  slug: string;
}

interface DomainsClientProps {
  configured: boolean;
  planAllowed: boolean;
  cnameTarget: string;
  initialDomains: DomainRow[];
  websites: Website[];
}

const STATUS_META: Record<DomainStatus, { label: string; className: string; spin?: boolean }> = {
  pending_dns: {
    label: "Add DNS records",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  },
  pending_ssl: {
    label: "Issuing SSL",
    className: "border-sky-500/40 bg-sky-500/10 text-sky-200",
    spin: true,
  },
  active: {
    label: "Live",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  },
  failed: {
    label: "Failed",
    className: "border-red-500/40 bg-red-500/10 text-red-300",
  },
};

function isApex(hostname: string): boolean {
  return hostname.split(".").filter(Boolean).length <= 2;
}

function DomainStatusBadge({ status }: { status: DomainStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5", meta.className)}>
      {meta.spin ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : status === "active" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : status === "failed" ? (
        <TriangleAlert className="h-3 w-3" />
      ) : null}
      {meta.label}
    </Badge>
  );
}

function DnsRecordRow({ record }: { record: DcvRecord }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-[var(--color-border)] bg-black/25 px-3 py-2.5">
      <Badge
        variant="outline"
        className="w-14 justify-center border-[var(--color-border)] bg-white/[0.03] uppercase text-[10px] tracking-wide text-[var(--color-bone-muted)]"
      >
        {record.kind}
      </Badge>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] uppercase tracking-wide text-[var(--color-bone-faint)]">
            Name
          </span>
          <code className="truncate font-mono text-xs text-[var(--color-bone)]">{record.name}</code>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] uppercase tracking-wide text-[var(--color-bone-faint)]">
            Value
          </span>
          <code className="truncate font-mono text-xs text-[var(--color-bone)]">
            {record.value}
          </code>
        </div>
      </div>
      <CopyButton value={record.value} idleLabel="Copy" successLabel="Copied" title="Copy value" />
    </div>
  );
}

function EmailRecordRow({ record }: { record: InboundEmailRecord }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-[var(--color-border)] bg-black/25 px-3 py-2.5">
      <Badge
        variant="outline"
        className="w-14 justify-center border-[var(--color-border)] bg-white/[0.03] uppercase text-[10px] tracking-wide text-[var(--color-bone-muted)]"
      >
        {record.kind}
      </Badge>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] uppercase tracking-wide text-[var(--color-bone-faint)]">
            Name
          </span>
          <code className="truncate font-mono text-xs text-[var(--color-bone)]">{record.name}</code>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] uppercase tracking-wide text-[var(--color-bone-faint)]">
            Value
          </span>
          <code className="truncate font-mono text-xs text-[var(--color-bone)]">
            {record.value}
          </code>
          {record.priority !== undefined ? (
            <span className="shrink-0 rounded border border-[var(--color-border)] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-[var(--color-bone-muted)]">
              priority {record.priority}
            </span>
          ) : null}
        </div>
      </div>
      <CopyButton value={record.value} idleLabel="Copy" successLabel="Copied" title="Copy value" />
    </div>
  );
}

/**
 * Inbound-email setup for a custom domain: the MX/TXT records the user adds
 * at their registrar, with live verification status from Resend. Appears once
 * an email-trigger address has been generated on this domain.
 */
function InboundEmailPanel({ domain }: { domain: DomainRow }) {
  const [emailStatus, setEmailStatus] = useState(domain.emailStatus ?? "pending");
  const [records, setRecords] = useState<InboundEmailRecord[]>(domain.emailRecords);
  const [checking, setChecking] = useState(false);

  const verified = emailStatus === "verified";

  async function check(manual: boolean): Promise<void> {
    if (manual) setChecking(true);
    try {
      const res = await fetch(`/api/workspace/domains/${domain.id}/email-status`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (manual) toast.error("Couldn't check email status. Try again in a moment.");
        return;
      }
      const data = (await res.json()) as {
        emailStatus: string;
        emailRecords?: InboundEmailRecord[];
      };
      setEmailStatus(data.emailStatus);
      if (data.emailRecords?.length) setRecords(data.emailRecords);
    } finally {
      if (manual) setChecking(false);
    }
  }

  // Poll until Resend reports the domain verified.
  // biome-ignore lint/correctness/useExhaustiveDependencies: poll restarts on status only
  useEffect(() => {
    if (verified) return;
    const t = setInterval(() => void check(false), 5000);
    return () => clearInterval(t);
  }, [verified]);

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-[var(--color-bone-muted)]">
          <Mail className="h-4 w-4 text-[var(--color-bone-faint)]" />
          Inbound email
        </div>
        <Badge
          variant="outline"
          className={cn(
            "gap-1.5",
            verified
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-200",
          )}
        >
          {verified ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          {verified ? "Receiving" : "Add DNS records"}
        </Badge>
      </div>
      {verified ? (
        <p className="text-xs text-[var(--color-bone-muted)]">
          Email sent to your generated address on @{domain.hostname} now triggers your function.
        </p>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-[var(--color-bone-muted)]">
            To receive trigger email at <code className="font-mono">@{domain.hostname}</code>, add
            these records at your registrar (e.g. Namecheap → Advanced DNS). The MX record must have
            the lowest priority value on the name.
          </p>
          <div className="space-y-2">
            {records.map((r) => (
              <EmailRecordRow key={`${r.kind}:${r.name}:${r.value}`} record={r} />
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={checking}
              onClick={() => void check(true)}
            >
              {checking ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Check now
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

const PROVIDERS = [
  {
    key: "namecheap",
    label: "Namecheap",
    hint: "Domain List → Manage → Advanced DNS → Add New Record. Pick the record Type, set Host to the part before your domain (e.g. www), and paste the Value.",
  },
  {
    key: "godaddy",
    label: "GoDaddy",
    hint: "My Products → DNS → Add. Choose the Type, set Name to the subdomain (e.g. www), and paste the Value into the data field.",
  },
  {
    key: "other",
    label: "Other",
    hint: "Open your registrar's DNS editor and add each record below with the exact Type, Name, and Value shown.",
  },
] as const;

/** DNS instructions + provider hints + live status — shared by the wizard and row drill-in. */
function DnsInstructions({
  domain,
  cnameTarget,
  onActive,
}: {
  domain: DomainRow;
  cnameTarget: string;
  onActive: () => void;
}) {
  const [status, setStatus] = useState<DomainStatus>(domain.status);
  const [records, setRecords] = useState<DcvRecord[]>(domain.dcvRecords);
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]["key"]>("namecheap");
  const [checking, setChecking] = useState(false);
  const firedActive = useRef(false);

  const apex = isApex(domain.hostname);

  async function check(manual: boolean): Promise<void> {
    if (manual) setChecking(true);
    try {
      const res = await fetch(`/api/workspace/domains/${domain.id}/status`, { cache: "no-store" });
      if (!res.ok) {
        if (manual) toast.error("Couldn't check status. Try again in a moment.");
        return;
      }
      const data = (await res.json()) as {
        status: DomainStatus;
        dcvRecords?: DcvRecord[];
        ownershipVerification?: DcvRecord | null;
      };
      setStatus(data.status);
      const next = [...(data.dcvRecords ?? [])];
      if (next.length) setRecords(next);
      if (data.status === "active" && !firedActive.current) {
        firedActive.current = true;
        onActive();
      }
    } finally {
      if (manual) setChecking(false);
    }
  }

  // Poll until the hostname reaches a terminal state. Restarting only on `status`
  // is intentional — `check` closes over fresh state/props on every render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: poll restarts on status only
  useEffect(() => {
    if (status === "active" || status === "failed") return;
    const t = setInterval(() => void check(false), 5000);
    return () => clearInterval(t);
  }, [status]);

  if (status === "active") {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-400" />
        <div>
          <p className="font-semibold text-[var(--color-bone)]">Your domain is live</p>
          <p className="mt-1 text-sm text-[var(--color-bone-muted)]">
            SSL is provisioned and traffic is being served from your function.
          </p>
        </div>
        <a
          href={`https://${domain.hostname}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
        >
          https://{domain.hostname}
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-[var(--color-bone-muted)]">
          {status === "pending_ssl" ? (
            <ShieldCheck className="h-4 w-4 text-sky-300" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
          )}
          {status === "pending_ssl"
            ? "Records verified — issuing your SSL certificate. This can take a few minutes."
            : "Waiting for your DNS records. Propagation can take a few minutes to a few hours."}
        </div>
        <DomainStatusBadge status={status} />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--color-bone)]">
          Add these record{records.length === 1 ? "" : "s"} at your registrar
        </p>
        {apex ? (
          <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-xs leading-relaxed text-amber-200/90">
            <strong>{domain.hostname}</strong> is a root domain, which can't use a CNAME directly.
            If your registrar supports an <code className="font-mono">ALIAS</code> /{" "}
            <code className="font-mono">ANAME</code> record (or CNAME flattening), point it at{" "}
            <code className="font-mono">{cnameTarget}</code>. Otherwise, add the records below on a{" "}
            <code className="font-mono">www</code> subdomain and set an apex redirect to it.
          </p>
        ) : null}
        <div className="space-y-2">
          {records.length ? (
            records.map((r) => <DnsRecordRow key={`${r.kind}:${r.name}`} record={r} />)
          ) : (
            <DnsRecordRow record={{ kind: "cname", name: domain.hostname, value: cnameTarget }} />
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 inline-flex rounded-lg border border-[var(--color-border)] bg-white/[0.02] p-0.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setProvider(p.key)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition",
                provider === p.key
                  ? "bg-white/[0.08] text-[var(--color-bone)]"
                  : "text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-[var(--color-bone-muted)]">
          {PROVIDERS.find((p) => p.key === provider)?.hint}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
        <p className="text-xs text-[var(--color-bone-faint)]">
          We'll keep checking automatically — you can close this and come back.
        </p>
        <Button variant="outline" size="sm" disabled={checking} onClick={() => void check(true)}>
          {checking ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          Check now
        </Button>
      </div>
    </div>
  );
}

export function DomainsClient({
  configured,
  planAllowed,
  cnameTarget,
  initialDomains,
  websites,
}: DomainsClientProps) {
  const [domains, setDomains] = useState<DomainRow[]>(initialDomains);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeDomain, setActiveDomain] = useState<DomainRow | null>(null);
  const [hostname, setHostname] = useState("");
  const [fnId, setFnId] = useState(websites[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Keep local rows in sync when the server component refetches.
  useEffect(() => setDomains(initialDomains), [initialDomains]);

  function openAddWizard() {
    setActiveDomain(null);
    setHostname("");
    setFnId(websites[0]?.id ?? "");
    setWizardOpen(true);
  }

  function submitAdd() {
    if (!hostname.trim() || !fnId) return;
    startTransition(async () => {
      const result = await addDomainAction({ hostname: hostname.trim(), fnId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const d = result.domain;
      const row: DomainRow = {
        id: d.id,
        hostname: d.hostname,
        status: d.status,
        sslStatus: d.sslStatus,
        dcvRecords: d.dcvRecords,
        ownershipVerification: d.ownershipVerification,
        lastError: null,
        fnSlug: d.fnSlug,
        resendDomainId: null,
        emailStatus: null,
        emailRecords: [],
      };
      setDomains((prev) => [row, ...prev.filter((p) => p.id !== row.id)]);
      setActiveDomain(row);
      toast.success("Domain added — add the DNS records to finish.");
    });
  }

  function removeDomain(id: string) {
    setRemovingId(id);
    startTransition(async () => {
      const result = await removeDomainAction({ domainId: id });
      if (!result.ok) {
        toast.error(result.error);
        setRemovingId(null);
        return;
      }
      setDomains((prev) => prev.filter((d) => d.id !== id));
      setRemovingId(null);
      toast.success("Domain removed.");
    });
  }

  if (!configured) {
    return (
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--color-bone-muted)]" />
            Custom domains
          </SettingsCardTitle>
          <SettingsCardDescription>
            Custom domains aren't enabled on this deployment yet. Once the platform's Cloudflare for
            SaaS zone is configured, you'll be able to attach your own domains here.
          </SettingsCardDescription>
        </SettingsCardHeader>
      </SettingsCard>
    );
  }

  if (!planAllowed) {
    return (
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--color-bone-muted)]" />
            Custom domains
          </SettingsCardTitle>
          <SettingsCardDescription>
            Serving functions from your own domain is a Team-plan feature. Upgrade your workspace to
            attach custom domains with automatic SSL.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent>
          <Button
            variant="glass"
            className="rounded-full px-4"
            onClick={() => {
              window.location.href = "/dashboard/settings/billing";
            }}
          >
            Upgrade to Team
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Button>
        </SettingsCardContent>
      </SettingsCard>
    );
  }

  const websiteOptions = websites.map((w) => ({ value: w.id, label: `/${w.slug}` }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-[var(--color-bone)]">Your domains</h4>
        <Button
          variant="glass"
          className="rounded-full px-4"
          onClick={openAddWizard}
          disabled={websites.length === 0}
          title={websites.length === 0 ? "Deploy a website first" : undefined}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add domain
        </Button>
      </div>

      {websites.length === 0 ? (
        <SettingsCard>
          <SettingsCardContent className="p-6 text-sm text-[var(--color-bone-muted)]">
            Deploy a website first, then come back to attach a custom domain to it.
          </SettingsCardContent>
        </SettingsCard>
      ) : domains.length === 0 ? (
        <SettingsCard>
          <SettingsCardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="rounded-full border border-[var(--color-border)] bg-white/[0.03] p-3">
              <Globe className="h-6 w-6 text-[var(--color-bone-muted)]" />
            </div>
            <div>
              <p className="font-medium text-[var(--color-bone)]">No custom domains yet</p>
              <p className="mt-1 text-sm text-[var(--color-bone-muted)]">
                Point a domain you own at one of your deployed websites.
              </p>
            </div>
            <Button variant="glass" className="mt-1 rounded-full px-4" onClick={openAddWizard}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add your first domain
            </Button>
          </SettingsCardContent>
        </SettingsCard>
      ) : (
        <SettingsCard>
          <ul className="divide-y divide-[var(--color-border)]">
            {domains.map((d) => (
              <li key={d.id} className="space-y-3 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 shrink-0 text-[var(--color-bone-faint)]" />
                      <span className="truncate font-medium text-[var(--color-bone)]">
                        {d.hostname}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate pl-6 text-xs text-[var(--color-bone-muted)]">
                      serves /{d.fnSlug}
                      {d.status === "failed" && d.lastError ? ` — ${d.lastError}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <DomainStatusBadge status={d.status} />
                    {d.status !== "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveDomain(d);
                          setWizardOpen(true);
                        }}
                      >
                        Setup
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[var(--color-bone-faint)] hover:text-red-300"
                      disabled={pending && removingId === d.id}
                      onClick={() => removeDomain(d.id)}
                      title="Remove domain"
                    >
                      {pending && removingId === d.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {d.resendDomainId ? <InboundEmailPanel domain={d} /> : null}
              </li>
            ))}
          </ul>
        </SettingsCard>
      )}

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-xl border-[var(--color-border)] bg-[var(--color-ink-elevated)]">
          {activeDomain ? (
            <>
              <DialogHeader>
                <DialogTitle>Finish connecting {activeDomain.hostname}</DialogTitle>
                <DialogDescription>
                  Add the DNS records below at your domain registrar. We verify and issue SSL
                  automatically.
                </DialogDescription>
              </DialogHeader>
              <DnsInstructions
                domain={activeDomain}
                cnameTarget={cnameTarget}
                onActive={() => {
                  setDomains((prev) =>
                    prev.map((d) => (d.id === activeDomain.id ? { ...d, status: "active" } : d)),
                  );
                  toast.success(`${activeDomain.hostname} is live!`);
                }}
              />
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add a custom domain</DialogTitle>
                <DialogDescription>
                  Enter a domain you own and choose which deployed website it should serve.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-1">
                <div className="space-y-1.5">
                  <label
                    htmlFor="domain-hostname"
                    className="text-sm font-medium text-[var(--color-bone)]"
                  >
                    Domain
                  </label>
                  <Input
                    id="domain-hostname"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder="www.example.com"
                    autoComplete="off"
                    spellCheck={false}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitAdd();
                    }}
                  />
                  <p className="text-xs text-[var(--color-bone-faint)]">
                    A subdomain like <code className="font-mono">www.example.com</code> is easiest.
                    Root domains are supported with extra DNS steps.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-sm font-medium text-[var(--color-bone)]">
                    Serve website
                  </span>
                  <CustomSelect
                    value={fnId}
                    onChange={setFnId}
                    options={websiteOptions}
                    placeholder="Choose a website"
                  />
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button variant="outline" onClick={() => setWizardOpen(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button
                  variant="glass"
                  onClick={submitAdd}
                  disabled={pending || !hostname.trim() || !fnId}
                >
                  {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Continue
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
