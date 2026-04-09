import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { isAdminUser, PLAN_CREDITS } from "@/lib/credits";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BillingClient } from "@/components/billing/billing-client";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = createSupabaseAdmin();
  const { data: user } = await supabase
    .from("ea_users")
    .select(
      "subscription_plan, subscription_status, stripe_subscription_id, credits_subscription, credits_topup, credits_reset_at"
    )
    .eq("clerk_id", userId)
    .limit(1);

  const row = user?.[0];
  const isAdmin = await isAdminUser(userId);

  // Fetch current period end + cancel status from Stripe if subscribed
  let periodEnd: string | null = null;
  let cancelAtPeriodEnd = false;
  if (row?.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      const cpe = (sub as { current_period_end?: number }).current_period_end;
      if (cpe) periodEnd = new Date(cpe * 1000).toISOString();
      cancelAtPeriodEnd =
        (sub as { cancel_at_period_end?: boolean }).cancel_at_period_end ?? false;
    } catch {
      // ignore — fall back to nulls
    }
  }

  const plan = isAdmin
    ? "admin"
    : ((row?.subscription_plan || "free") as "free" | "pro" | "pro_plus");

  const planLimit = isAdmin
    ? -1
    : PLAN_CREDITS[plan as keyof typeof PLAN_CREDITS] ?? PLAN_CREDITS.free;

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full pb-bottom-nav">
        <BillingClient
          plan={plan}
          isAdmin={isAdmin}
          creditsSubscription={row?.credits_subscription ?? 0}
          creditsTopup={row?.credits_topup ?? 0}
          planLimit={planLimit}
          periodEnd={periodEnd}
          cancelAtPeriodEnd={cancelAtPeriodEnd}
          creditsResetAt={row?.credits_reset_at ?? null}
          hasSubscription={!!row?.stripe_subscription_id}
        />
      </main>
      <Footer />
    </div>
  );
}
