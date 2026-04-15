import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const topupSchema = z.object({
  package: z.enum(["small", "medium", "large"]),
});

// Top-up packages: amount in credits → Stripe price
const TOPUP_PACKAGES: Record<string, { credits: number; price_cents: number; label: string }> = {
  small: { credits: 15, price_cents: 299, label: "15 Credits" },
  medium: { credits: 40, price_cents: 599, label: "40 Credits" },
  large: { credits: 100, price_cents: 1199, label: "100 Credits" },
};

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
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const parsed = topupSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "invalid_package", message: "Ungültiges Credit-Paket." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const pkg = parsed.data.package;
  const topup = TOPUP_PACKAGES[pkg]!;

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
