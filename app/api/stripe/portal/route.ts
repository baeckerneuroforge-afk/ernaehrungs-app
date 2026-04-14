import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST() {
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

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ea_users")
    .select("stripe_customer_id")
    .eq("clerk_id", userId)
    .limit(1);

  const customerId = data?.[0]?.stripe_customer_id;
  if (!customerId) {
    return new Response(
      JSON.stringify({
        error: "no_subscription",
        message: "Kein aktives Abo gefunden.",
      }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/profil`,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
}
