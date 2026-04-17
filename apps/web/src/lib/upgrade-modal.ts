"use client";

const QUOTA_ERRORS = new Set([
  "daily_execution_limit_exceeded",
  "monthly_wall_time_limit_exceeded",
]);

export function isQuotaLimitError(message: string): boolean {
  for (const code of QUOTA_ERRORS) {
    if (message.includes(code)) return true;
  }
  return false;
}

export function openUpgradeModal() {
  window.dispatchEvent(new Event("hostfunc:open-upgrade-modal"));
}
