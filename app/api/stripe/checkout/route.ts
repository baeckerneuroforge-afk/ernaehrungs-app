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

  const supabase = createSupabaseAdmin();

  // Get or create Stripe customer
  const { data: userData } = await supabase
    .from("ea_users")
    .select("stripe_customer_id, email")
    .eq("clerk_id", userId)
    .limit(1);

  let customerId = userData?.[0]?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData?.[0]?.email || undefined,
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
