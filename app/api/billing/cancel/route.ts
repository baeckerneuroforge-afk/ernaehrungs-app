import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ea_users")
    .select("stripe_subscription_id")
    .eq("clerk_id", userId)
    .limit(1);

  const subscriptionId = data?.[0]?.stripe_subscription_id;
  if (!subscriptionId) {
    return NextResponse.json(
      { error: "Kein aktives Abo gefunden." },
      { status: 404 }
    );
  }

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    const periodEnd =
      (subscription as { current_period_end?: number }).current_period_end ??
      null;

    return NextResponse.json({
      success: true,
      cancel_at_period_end: true,
      period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Stripe-Fehler" },
      { status: 500 }
    );
  }
}
