import { Webhook } from "svix";
import { headers } from "next/headers";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { purgeUserData } from "@/lib/purge-user-data";
import { cancelStripeSubscriptionForUser } from "@/lib/cancel-stripe-subscription";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/email-templates";

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: { email_address: string }[];
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
  };
}

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerPayload = headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn("[clerk-webhook] missing svix headers", {
      hasId: !!svixId,
      hasTimestamp: !!svixTimestamp,
      hasSignature: !!svixSignature,
    });
    return new Response("Missing svix headers", { status: 400 });
  }

  // Raw-Body-Verification: svix muss gegen den exakten, unveränderten
  // Request-Body hashen. await request.json() + JSON.stringify würde
  // Whitespace/Key-Order verändern und damit die HMAC-Verifikation
  // unzuverlässig machen. Erst raw lesen → verify → dann parse.
  const body = await request.text();

  const wh = new Webhook(WEBHOOK_SECRET);

  try {
    wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("[clerk-webhook] signature verify failed", {
      svixId,
      message: err instanceof Error ? err.message : String(err),
    });
    return new Response("Invalid signature", { status: 400 });
  }

  let evt: ClerkWebhookEvent;
  try {
    evt = JSON.parse(body) as ClerkWebhookEvent;
  } catch {
    console.error("[clerk-webhook] invalid JSON body", { svixId });
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log("[clerk-webhook] received", {
    type: evt.type,
    userId: evt.data?.id,
    svixId,
  });

  const supabase = createSupabaseAdmin();

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses?.[0]?.email_address || "";
    const name = [first_name, last_name].filter(Boolean).join(" ") || null;

    const now = new Date().toISOString();

    // Zwei-Query-Pattern: credits_subscription darf NUR beim INSERT gesetzt
    // werden. Ein blindes UPSERT mit credits_subscription im Payload würde
    // bezahlende Bestandsuser auf 15 zurücksetzen.
    const { data: existing, error: lookupError } = await supabase
      .from("ea_users")
      .select("clerk_id")
      .eq("clerk_id", id)
      .maybeSingle();

    if (lookupError) {
      console.error("[clerk-webhook] ea_users lookup failed", {
        userId: id,
        error: lookupError.message,
      });
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("ea_users")
        .update({
          email,
          name,
          image_url: image_url || null,
          updated_at: now,
          last_active_at: now,
        })
        .eq("clerk_id", id);
      if (updateError) {
        console.error("[clerk-webhook] ea_users update failed", {
          userId: id,
          error: updateError.message,
        });
      } else {
        console.log("[clerk-webhook] ea_users updated", { userId: id });
      }
    } else {
      const { error: insertError } = await supabase.from("ea_users").insert({
        clerk_id: id,
        email,
        name,
        image_url: image_url || null,
        subscription_plan: "free",
        credits_subscription: 15,
        credits_topup: 0,
        updated_at: now,
        last_active_at: now,
      });
      if (insertError) {
        console.error("[clerk-webhook] ea_users insert failed", {
          userId: id,
          error: insertError.message,
        });
      } else {
        console.log("[clerk-webhook] ea_users inserted", { userId: id });
      }

      // Welcome email only on fresh insert, and only for user.created
      // (user.updated arriving before any INSERT would be an odd edge case
      // but we still guard against sending a welcome for it).
      if (evt.type === "user.created" && email && !insertError) {
        const template = emailTemplates.welcome(first_name || "dort");
        void sendEmail({ to: email, subject: template.subject, html: template.html });
      }
    }
  }

  if (evt.type === "user.deleted") {
    const { id } = evt.data;
    // Full DSGVO Art. 17 purge — same logic as /api/user/delete, minus the
    // Clerk account deletion (Clerk already removed it; this event IS that
    // deletion). Without this, a user deleted directly in Clerk would leave
    // all their food logs, weights, chats, plans, photos etc. behind.
    await cancelStripeSubscriptionForUser(supabase, id, "clerk-webhook");
    const { errors } = await purgeUserData(supabase, id, "clerk-webhook");
    const { error: userErr } = await supabase
      .from("ea_users")
      .delete()
      .eq("clerk_id", id);
    if (userErr) errors.push(`ea_users: ${userErr.message}`);
    if (errors.length > 0) {
      console.error("[clerk-webhook] user.deleted purge had errors", {
        userId: id,
        errors,
      });
    } else {
      console.log("[clerk-webhook] user.deleted purge complete", { userId: id });
    }
  }

  return new Response("OK", { status: 200 });
}
