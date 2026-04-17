import "server-only";

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
