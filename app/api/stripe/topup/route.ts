import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// Top-up packages: amount in credits → Stripe price
const TOPUP_PACKAGES: Record<string, { credits: number; price_cents: number; label: string }> = {
  small: { credits: 30, price_cents: 299, label: "30 Credits" },
  medium: { credits: 75, price_cents: 599, label: "75 Credits" },
  large: { credits: 200, price_cents: 1299, label: "200 Credits" },
};

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { package: pkg } = await request.json();
  const topup = TOPUP_PACKAGES[pkg];

  if (!topup) {
    return new Response(JSON.stringify({ error: "Invalid package" }), { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  // Get or create Stripe customer
  const { data: userData } = await supabase
    .from("ea_users")
    .select("stripe_customer_id, email")
    .eq("clerk_id", userId)
    .single();

  let customerId = userData?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData?.email || undefined,
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
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: `${topup.label} – Ernährungsberatung` },
          unit_amount: topup.price_cents,
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/chat?topup=success`,
    cancel_url: `${appUrl}/chat?topup=canceled`,
    metadata: {
      clerk_id: userId,
      type: "credit_topup",
      credits: topup.credits.toString(),
      package: pkg,
    },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
}
