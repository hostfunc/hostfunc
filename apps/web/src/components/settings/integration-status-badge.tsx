import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type IntegrationStatus =
  | "inherited"
  | "custom"
  | "configured"
  | "connected"
  | "unconfigured"
  | "disconnected";

const STATUS_STYLES: Record<IntegrationStatus, { className: string; label: string }> = {
  inherited: {
    className: "border-[var(--color-border)] bg-white/[0.03] text-[var(--color-bone-muted)]",
    label: "Inherited",
  },
  custom: {
    className: "border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 text-amber-200",
    label: "Custom",
  },
  configured: {
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    label: "Configured",
  },
  connected: {
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    label: "Connected",
  },
  unconfigured: {
    className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    label: "Needs setup",
  },
  disconnected: {
    className: "border-[var(--color-border)] bg-white/[0.03] text-[var(--color-bone-muted)]",
    label: "Not connected",
  },
};

export function IntegrationStatusBadge({
  status,
  label,
  className,
}: {
  status: IntegrationStatus;
  label?: string | undefined;
  className?: string | undefined;
}) {
  const style = STATUS_STYLES[status];
  return (
    <Badge variant="outline" className={cn(style.className, className)}>
      {label ?? style.label}
    </Badge>
  );
}
