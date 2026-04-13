export const TEMPLATES: Record<string, string> = {
  "hello-world": `import fn from "@hostfunc/fn";

export async function main(input: { name?: string }) {
  const name = input.name ?? "world";
  return { message: \`hello, \${name}\` };
}
`,
  webhook: `import fn, { secret } from "@hostfunc/fn";
// e.g. import Stripe from 'stripe';

export async function main(req: Request) {
  // Validate webhooks effortlessly
  const payload = await req.json();
  
  if (payload.type === "payment.succeeded") {
     console.log("Processing payment!");
  }

  return { received: true };
}
`,
  cron: `import fn from "@hostfunc/fn";

export async function main(event: { time: string }) {
  // Runs based on scheduled interval
  console.log("Cron execution triggered at:", event.time);
  
  // Clean up database records or sync external APIS
  return { status: "completed", timestamp: Date.now() };
}
`,
};
