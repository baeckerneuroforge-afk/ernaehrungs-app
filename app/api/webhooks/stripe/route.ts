import { stripe, PLANS } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { addCredits, resetSubscriptionCredits, PLAN_CREDITS, PLAN_LABELS, PLAN_PRICES } from "@/lib/credits";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/email-templates";
import { getPostHogClient } from "@/lib/posthog-server";
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

  // ---- Idempotency guard ----
  // Stripe retries webhooks on non-2xx. Without a dedupe check, a retried
  // checkout.session.completed would grant credits twice. We INSERT the
  // event_id first and rely on the PRIMARY KEY conflict as our atomic
  // "has-this-been-processed" check — no read-then-write race.
  const { error: dedupeErr } = await supabase
    .from("ea_stripe_events")
    .insert({ event_id: event.id, event_type: event.type });

  if (dedupeErr) {
    // Unique-violation (code 23505) == duplicate delivery; swallow and ack.
    // Any other error means the dedupe table itself is broken — we still
    // return 200 to avoid Stripe retry storms but log loudly.
    if (dedupeErr.code === "23505") {
      console.log("[stripe-webhook] duplicate event, skipping:", event.id);
    } else {
      console.error("[stripe-webhook] dedupe insert failed:", dedupeErr);
    }
    return new Response(
      JSON.stringify({ received: true, duplicate: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Return a 500 so Stripe retries — but first remove the dedupe marker we
  // inserted above, otherwise the retry would hit the idempotency guard and
  // become a no-op. Only use this for genuinely unexpected/transient failures.
  const failForRetry = async (logMsg: string): Promise<Response> => {
    console.error(`[stripe-webhook] ${logMsg} (event ${event.id}, ${event.type})`);
    await supabase.from("ea_stripe_events").delete().eq("event_id", event.id);
    return new Response("Webhook handler error", { status: 500 });
  };

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
          const posthog = getPostHogClient();
          posthog.capture({
            distinctId: clerkId,
            event: "credits_topup_purchased",
            properties: { credits, package: metadata.package },
          });
          await posthog.shutdown();
        }
        break;
      }

      // Subscription checkout
      const rawPlan = metadata?.plan;
      const subscriptionId = (session as { subscription?: string }).subscription;
      const customerId = (session as { customer?: string }).customer;

      // Plan comes from our own (validated) checkout metadata. An unknown plan
      // means a code/config mismatch (e.g. a new Stripe plan not yet mapped) —
      // do NOT silently grant free credits to a paying customer. Fail so the
      // event surfaces and re-processes after the mapping is fixed.
      if (!rawPlan || !(rawPlan in PLAN_CREDITS)) {
        return await failForRetry(`unknown plan in checkout metadata: ${rawPlan}`);
      }
      const plan = rawPlan as PlanType;

      if (clerkId && subscriptionId) {
        const { data: updated, error: updateErr } = await supabase
          .from("ea_users")
          .update({
            subscription_plan: plan,
            subscription_status: "active" as SubscriptionStatus,
            stripe_subscription_id: subscriptionId,
            // Defensive: ensure customer_id is set so later events that look
            // up by stripe_customer_id (invoice.paid, subscription.*) resolve.
            ...(customerId ? { stripe_customer_id: customerId } : {}),
          })
          .eq("clerk_id", clerkId)
          .select("clerk_id");

        if (updateErr) {
          return await failForRetry(`checkout user update failed: ${updateErr.message}`);
        }
        if (!updated || updated.length === 0) {
          // Paid checkout but no matching user row — unexpected and money-
          // critical. Retry (the row may appear once a Clerk webhook lands).
          return await failForRetry(`checkout: no ea_users row for clerk_id ${clerkId}`);
        }

        // Grant initial credits for the plan
        const planCredits = PLAN_CREDITS[plan];
        await resetSubscriptionCredits(clerkId, planCredits);

        // Confirmation email — fire-and-forget so a mail outage can't block Stripe
        const { data: userRow } = await supabase
          .from("ea_users")
          .select("email, name")
          .eq("clerk_id", clerkId)
          .maybeSingle();
        if (userRow?.email) {
          const planLabel = PLAN_LABELS[plan] ?? plan;
          const price = `${(PLAN_PRICES[plan] ?? 0).toFixed(2).replace(".", ",")} €`;
          const template = emailTemplates.subscriptionConfirmed(
            userRow.name || "dort",
            planLabel,
            price
          );
          void sendEmail({ to: userRow.email, subject: template.subject, html: template.html });
        }
        const posthog = getPostHogClient();
        posthog.capture({
          distinctId: clerkId,
          event: "subscription_activated",
          properties: { plan },
        });
        await posthog.shutdown();
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
          .maybeSingle();

        if (user) {
          const plan = (user.subscription_plan || "free") as PlanType;
          const planCredits = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
          await resetSubscriptionCredits(user.clerk_id, planCredits);
        } else {
          // A recurring payment for a customer we can't find is concerning
          // (e.g. account deleted). Log loudly but ack — retrying won't help.
          console.error(
            `[stripe-webhook] invoice.paid: no ea_users for customer ${customerId} (event ${event.id})`
          );
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

      // Derive the plan from the active price so up-/downgrades are reflected
      // immediately (not only at the next invoice.paid). Credits stay until the
      // billing cycle resets them — avoids double-granting on mid-cycle changes.
      const priceId = (
        subscription as { items?: { data?: Array<{ price?: { id?: string } }> } }
      ).items?.data?.[0]?.price?.id;
      const derivedPlan = (Object.keys(PLANS) as Array<keyof typeof PLANS>).find(
        (p) => PLANS[p] === priceId
      );

      const updatePayload: { subscription_status: SubscriptionStatus; subscription_plan?: PlanType } =
        { subscription_status: status };
      if (derivedPlan) updatePayload.subscription_plan = derivedPlan;

      const { data: updated, error: updateErr } = await supabase
        .from("ea_users")
        .update(updatePayload)
        .eq("stripe_customer_id", customerId)
        .select("clerk_id");

      if (updateErr) {
        console.error(
          `[stripe-webhook] subscription.updated failed for customer ${customerId}: ${updateErr.message}`
        );
      } else if (!updated || updated.length === 0) {
        console.error(
          `[stripe-webhook] subscription.updated: no ea_users for customer ${customerId} (event ${event.id})`
        );
      }
      break;
    }

    // ---- Subscription deleted ----
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = (subscription as { customer: string }).customer;

      const { data: cancelled, error: cancelErr } = await supabase
        .from("ea_users")
        .update({
          subscription_plan: "free" as PlanType,
          subscription_status: "canceled" as SubscriptionStatus,
          stripe_subscription_id: null,
        })
        .eq("stripe_customer_id", customerId)
        .select("clerk_id");

      if (cancelErr) {
        console.error(
          `[stripe-webhook] subscription.deleted failed for customer ${customerId}: ${cancelErr.message}`
        );
      } else if (!cancelled || cancelled.length === 0) {
        // Legitimate if the account was already deleted — log, don't retry.
        console.warn(
          `[stripe-webhook] subscription.deleted: no ea_users for customer ${customerId} (event ${event.id})`
        );
      }

      // Reset to free tier credits
      const { data: user } = await supabase
        .from("ea_users")
        .select("clerk_id, email, name")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (user) {
        await resetSubscriptionCredits(user.clerk_id, PLAN_CREDITS.free);

        const posthog = getPostHogClient();
        posthog.capture({
          distinctId: user.clerk_id,
          event: "subscription_cancelled",
          properties: {},
        });
        await posthog.shutdown();

        if (user.email) {
          // Stripe's cancel_at_period_end timestamp would be ideal here but
          // isn't present on this event; "Ende der Laufzeit" reads fine.
          const template = emailTemplates.subscriptionCancelled(
            user.name || "dort",
            "Ende der Laufzeit"
          );
          void sendEmail({ to: user.email, subject: template.subject, html: template.html });
        }
      }
      break;
    }

    // ---- Payment failed ----
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = (invoice as { customer: string }).customer;

      const { data: pastDue, error: pastDueErr } = await supabase
        .from("ea_users")
        .update({ subscription_status: "past_due" as SubscriptionStatus })
        .eq("stripe_customer_id", customerId)
        .select("clerk_id");

      if (pastDueErr) {
        console.error(
          `[stripe-webhook] payment_failed update failed for customer ${customerId}: ${pastDueErr.message}`
        );
      } else if (!pastDue || pastDue.length === 0) {
        console.warn(
          `[stripe-webhook] payment_failed: no ea_users for customer ${customerId} (event ${event.id})`
        );
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
