import "server-only";

import { env } from "@/lib/env";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendTransactionalEmail(input: SendEmailInput) {
  if (!env.RESEND_API_KEY) {
    console.info("\n────────────────────────────────────────");
    console.info(`[email:dev] To: ${input.to}`);
    console.info(`[email:dev] Subject: ${input.subject}`);
    if (input.text) {
      console.info(input.text);
    } else {
      console.info(
        input.html
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      );
    }
    console.info("────────────────────────────────────────\n");
    return { ok: true, provider: "dev-console" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`resend_send_failed:${response.status}${body ? `:${body}` : ""}`);
  }

  return { ok: true, provider: "resend" as const };
}
