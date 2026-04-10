import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

type Theme = "light" | "dark" | "system";

interface NotificationPreferences {
  tagebuch_reminder: { enabled: boolean; time: string };
  review_reminder: { enabled: boolean };
  credit_warning_email: { enabled: boolean };
}

const DEFAULT_PREFS: NotificationPreferences = {
  tagebuch_reminder: { enabled: false, time: "20:00" },
  review_reminder: { enabled: false },
  credit_warning_email: { enabled: true },
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ea_users")
    .select("notification_preferences, theme")
    .eq("clerk_id", userId)
    .limit(1);

  const row = data?.[0];
  return new Response(
    JSON.stringify({
      notification_preferences: row?.notification_preferences ?? DEFAULT_PREFS,
      theme: (row?.theme as Theme) ?? "system",
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.notification_preferences) {
    // Minimal validation — ensure the shape matches what we expect
    const p = body.notification_preferences as Partial<NotificationPreferences>;
    const sanitized: NotificationPreferences = {
      tagebuch_reminder: {
        enabled: !!p.tagebuch_reminder?.enabled,
        time: typeof p.tagebuch_reminder?.time === "string" ? p.tagebuch_reminder.time : "20:00",
      },
      review_reminder: { enabled: !!p.review_reminder?.enabled },
      credit_warning_email: { enabled: p.credit_warning_email?.enabled ?? true },
    };
    update.notification_preferences = sanitized;
  }

  if (body.theme) {
    if (!["light", "dark", "system"].includes(body.theme)) {
      return new Response(JSON.stringify({ error: "Invalid theme" }), { status: 400 });
    }
    update.theme = body.theme;
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("ea_users")
    .update(update)
    .eq("clerk_id", userId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // TODO: When Resend is wired up, trigger email-preference sync here
  // (e.g. subscribe/unsubscribe user from reminder + credit-warning lists).

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
