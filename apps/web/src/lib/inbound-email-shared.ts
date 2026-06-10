/**
 * Pure, env-free pieces of the inbound-email pipeline, shared by the server
 * dispatch (`@/server/inbound-email`) and unit tests.
 */

/**
 * Normalized inbound mail before persistence / runtime (provider-agnostic).
 * Webhook or Email Worker adapters should converge to this shape.
 */
export type NormalizedInboundEmail = {
  to: string;
  from: string;
  subject: string;
  textBody: string;
  rawSize: number;
  receivedAt: Date;
};

/** JSON body for internal `/run` when invoking a function via the email trigger. */
export function toEmailTriggerRuntimeBody(input: NormalizedInboundEmail) {
  const body = input.textBody.trim();
  const subject = input.subject.trim();
  return {
    hostfuncTriggerKind: "email" as const,
    email: {
      ...(body ? { body } : {}),
      from: input.from,
      rawSize: input.rawSize,
      ...(subject ? { subject } : {}),
      timestamp: input.receivedAt.toISOString(),
      to: input.to,
    },
  };
}

/** Empty/missing allowlist accepts any sender; otherwise case-insensitive membership. */
export function matchesAllowlist(allowlist: string[] | undefined, from: string): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  const sender = from.toLowerCase();
  return allowlist.some((value) => value.toLowerCase() === sender);
}

/** Provider-agnostic inbound message, as delivered by the email worker or a webhook. */
export type InboundEmailMessage = {
  to: string;
  from: string;
  subject?: string;
  text?: string;
  rawSize?: number;
  headers?: Record<string, string>;
};

export type DispatchResult =
  | { matched: false }
  | { matched: true; status: number; executionId: string | null; triggerId: string };
