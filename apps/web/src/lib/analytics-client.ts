"use client";

export async function trackClientEvent(
  event: string,
  props?: Record<string, unknown>,
): Promise<void> {
  const distinctId =
    typeof window !== "undefined"
      ? (window.localStorage.getItem("hostfunc_anon_id") ??
        window.crypto?.randomUUID?.() ??
        "anon")
      : "anon";

  if (typeof window !== "undefined" && !window.localStorage.getItem("hostfunc_anon_id")) {
    window.localStorage.setItem("hostfunc_anon_id", distinctId);
  }

  await fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event, props, distinctId }),
  }).catch(() => null);
}
