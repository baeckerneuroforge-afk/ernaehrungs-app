import { stripe } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase/server";
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
    case "checkout.session.completed": {
      const session = event.data.object;
      const clerkId = (session as { metadata?: Record<string, string> }).metadata?.clerk_id;
      const plan = ((session as { metadata?: Record<string, string> }).metadata?.plan || "pro") as PlanType;
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
      }
      break;
    }

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
      break;
    }

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
