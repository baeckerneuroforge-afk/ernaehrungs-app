import { stripe } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { addCredits, resetSubscriptionCredits, PLAN_CREDITS } from "@/lib/credits";
import type { PlanType, SubscriptionStatus } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing signature", { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  switch (event.type) {
    // ---- Subscription checkout completed ----
    case "checkout.session.completed": {
      const session = event.data.object;
      const metadata = (session as { metadata?: Record<string, string> }).metadata;
      const clerkId = metadata?.clerk_id;

      // Credit top-up purchase (one-time payment)
      if (metadata?.type === "credit_topup" && clerkId) {
        const credits = parseInt(metadata.credits || "0", 10);
        if (credits > 0) {
          await addCredits(
            clerkId,
            credits,
            "topup_purchase",
            `Top-Up: ${credits} Credits gekauft (${metadata.package})`
          );
        }
        break;
      }

      // Subscription checkout
      const plan = (metadata?.plan || "pro") as PlanType;
      const subscriptionId = (session as { subscription?: string }).subscription;

      if (clerkId && subscriptionId) {
        await supabase
          .from("ea_users")
          .update({
            subscription_plan: plan,
            subscription_status: "active" as SubscriptionStatus,
            stripe_subscription_id: subscriptionId,
          })
          .eq("clerk_id", clerkId);

        // Grant initial credits for the plan
        const planCredits = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
        await resetSubscriptionCredits(clerkId, planCredits);
      }
      break;
    }

    // ---- Subscription renewed (invoice paid) ----
    case "invoice.paid": {
      const invoice = event.data.object;
      const customerId = (invoice as { customer: string }).customer;
      const billingReason = (invoice as { billing_reason?: string }).billing_reason;

      // Only reset credits on recurring payments, not the first one
      if (billingReason === "subscription_cycle") {
        const { data: user } = await supabase
          .from("ea_users")
          .select("clerk_id, subscription_plan")
          .eq("stripe_customer_id", customerId)
          .single();

        if (user) {
          const plan = (user.subscription_plan || "free") as PlanType;
          const planCredits = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
          await resetSubscriptionCredits(user.clerk_id, planCredits);
        }
      }
      break;
    }

    // ---- Subscription updated ----
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId = (subscription as { customer: string }).customer;
      const subStatus = (subscription as { status: string }).status;

      const status: SubscriptionStatus =
        subStatus === "active"
          ? "active"
          : subStatus === "past_due"
          ? "past_due"
          : subStatus === "canceled"
          ? "canceled"
          : subStatus === "trialing"
          ? "trialing"
          : "none";

      await supabase
        .from("ea_users")
        .update({ subscription_status: status })
        .eq("stripe_customer_id", customerId);
      break;
    }

    // ---- Subscription deleted ----
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = (subscription as { customer: string }).customer;

      await supabase
        .from("ea_users")
        .update({
          subscription_plan: "free" as PlanType,
          subscription_status: "canceled" as SubscriptionStatus,
          stripe_subscription_id: null,
        })
        .eq("stripe_customer_id", customerId);

      // Reset to free tier credits
      const { data: user } = await supabase
        .from("ea_users")
        .select("clerk_id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (user) {
        await resetSubscriptionCredits(user.clerk_id, PLAN_CREDITS.free);
      }
      break;
    }

    // ---- Payment failed ----
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = (invoice as { customer: string }).customer;

      await supabase
        .from("ea_users")
        .update({ subscription_status: "past_due" as SubscriptionStatus })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
