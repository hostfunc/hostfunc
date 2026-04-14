import Stripe from "stripe";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __hostfunc_stripe__: Stripe | undefined;
}

function buildStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required for billing operations.");
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia",
    appInfo: {
      name: "hostfunc",
      version: "0.1.0",
    },
  });
}

export const stripe: Stripe = globalThis.__hostfunc_stripe__ ?? buildStripeClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__hostfunc_stripe__ = stripe;
}
