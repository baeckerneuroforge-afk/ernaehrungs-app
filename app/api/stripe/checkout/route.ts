import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { stripe, PLANS } from "@/lib/stripe";
import { getPostHogClient } from "@/lib/posthog-server";
import { z } from "zod";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "pro_plus"]),
});

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return new Response(
      JSON.stringify({
        error: "payment_not_configured",
        message:
          "Das Zahlungssystem wird gerade eingerichtet. Bitte versuche es später erneut.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return new Response(
      JSON.stringify({ error: "unauthorized", message: "Bitte melde dich erneut an." }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid_body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const parsed = checkoutSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "invalid_input", message: parsed.error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { plan } = parsed.data;
  const priceId = PLANS[plan];
  if (!priceId) {
    return new Response(
      JSON.stringify({
        error: "payment_not_configured",
        message: "Preis-ID für diesen Plan fehlt. Bitte Support kontaktieren.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createSupabaseAdmin();

  // Get or create Stripe customer
  const { data: userData } = await supabase
    .from("ea_users")
    .select(
      "stripe_customer_id, email, stripe_subscription_id, subscription_status, subscription_plan"
    )
    .eq("clerk_id", userId)
    .limit(1);

  const row = userData?.[0];
  // Prevent double subscriptions: active/trialing (or past_due still on file)
  // must use Customer Portal / upgrade path, not a second Checkout subscription.
  const existingSub = row?.stripe_subscription_id;
  const existingStatus = row?.subscription_status;
  if (
    existingSub &&
    (existingStatus === "active" ||
      existingStatus === "trialing" ||
      existingStatus === "past_due")
  ) {
    return new Response(
      JSON.stringify({
        error: "already_subscribed",
        message:
          "Du hast bereits ein aktives Abo. Nutze das Kundenportal, um deinen Plan zu ändern.",
        subscription_plan: row?.subscription_plan,
      }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );
  }

  let customerId = row?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: row?.email || undefined,
      metadata: { clerk_id: userId },
    });
    customerId = customer.id;

    await supabase
      .from("ea_users")
      .update({ stripe_customer_id: customerId })
      .eq("clerk_id", userId);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/chat?upgrade=success`,
    cancel_url: `${appUrl}/chat?upgrade=canceled`,
    metadata: { clerk_id: userId, plan },
  });

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: userId,
    event: "subscription_checkout_started",
    properties: { plan, interval: "monthly" },
  });
  await posthog.shutdown();

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
}
