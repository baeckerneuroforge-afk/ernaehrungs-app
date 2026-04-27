import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

// Keep named export for backward compatibility - lazy getter
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const PLANS = {
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  pro_plus: process.env.STRIPE_PRICE_PROPLUS_MONTHLY!,
} as const;

export type PlanType = "free" | "pro" | "pro_plus";
export type SubscriptionStatus = "none" | "active" | "past_due" | "canceled" | "trialing";
