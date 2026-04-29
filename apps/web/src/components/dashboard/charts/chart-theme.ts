export const chartColors = {
  amber: "var(--color-amber)",
  amberSolid: "#f59e0b",
  bone: "var(--color-bone)",
  boneMuted: "var(--color-bone-muted)",
  boneFaint: "var(--color-bone-faint)",
  border: "var(--color-border)",
  ok: "#34d399",
  error: "#f87171",
  warn: "#fbbf24",
  cool: "#60a5fa",
} as const;

export const triggerPalette = ["#f59e0b", "#60a5fa", "#34d399", "#a78bfa", "#f472b6", "#94a3b8"];

export const statusColors: Record<string, string> = {
  ok: chartColors.ok,
  fn_error: chartColors.error,
  limit_exceeded: chartColors.warn,
  infra_error: chartColors.cool,
};

export const statusLabels: Record<string, string> = {
  ok: "OK",
  fn_error: "Errors",
  limit_exceeded: "Limit",
  infra_error: "Infra",
};
