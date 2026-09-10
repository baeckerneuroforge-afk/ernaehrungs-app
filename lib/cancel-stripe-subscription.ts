import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

type AdminClient = ReturnType<typeof createSupabaseAdmin>;

/**
 * Cancel any active Stripe subscription for a user about to be purged.
 * Best-effort: logs errors but does not throw — DSGVO data wipe must proceed.
 */
export async function cancelStripeSubscriptionForUser(
  supabase: AdminClient,
  clerkId: string,
  logPrefix = "stripe-cancel"
): Promise<void> {
  try {
    const { data: user } = await supabase
      .from("ea_users")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    const subId = user?.stripe_subscription_id;
    if (!subId) return;

    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn(
        `[${logPrefix}] STRIPE_SECRET_KEY missing — cannot cancel sub ${subId} for ${clerkId}`
      );
      return;
    }

    const stripe = getStripe();
    try {
      await stripe.subscriptions.cancel(subId);
    } catch (err) {
      // Already canceled / missing is fine for purge paths.
      const msg = err instanceof Error ? err.message : String(err);
      if (!/No such subscription|canceled|already been canceled/i.test(msg)) {
        console.error(
          `[${logPrefix}] failed to cancel subscription ${subId} for ${clerkId}:`,
          msg
        );
      }
    }
  } catch (err) {
    console.error(`[${logPrefix}] unexpected error for ${clerkId}:`, err);
  }
}
