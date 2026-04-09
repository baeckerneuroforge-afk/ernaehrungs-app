import { Webhook } from "svix";
import { headers } from "next/headers";
import { createSupabaseAdmin } from "@/lib/supabase/server";

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
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerPayload = headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await request.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: ClerkWebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses?.[0]?.email_address || "";
    const name = [first_name, last_name].filter(Boolean).join(" ") || null;

    const now = new Date().toISOString();
    await supabase.from("ea_users").upsert(
      {
        clerk_id: id,
        email,
        name,
        image_url: image_url || null,
        updated_at: now,
        // Treat any user.created/user.updated event as activity so the
        // inactive-account cron has a fresh signal even for users who don't
        // hit the chat APIs (e.g. just login).
        last_active_at: now,
      },
      { onConflict: "clerk_id" }
    );
  }

  if (evt.type === "user.deleted") {
    const { id } = evt.data;
    // Cascade: delete profile and related data
    await supabase.from("ea_profiles").delete().eq("user_id", id);
    await supabase.from("ea_users").delete().eq("clerk_id", id);
  }

  return new Response("OK", { status: 200 });
}
