/// <reference types="@cloudflare/workers-types" />

interface Env {
  CONTROL_PLANE_URL: string;
  CONTROL_PLANE_TOKEN: string;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    const headers: Record<string, string> = {};
    message.headers.forEach((value, key) => {
      headers[key] = value;
    });
    await fetch(`${env.CONTROL_PLANE_URL}/api/internal/email/inbound`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.CONTROL_PLANE_TOKEN}`,
      },
      body: JSON.stringify({
        to: message.to,
        from: message.from,
        subject: message.headers.get("subject") ?? "",
        text: "",
        headers,
      }),
    });
  },
};
