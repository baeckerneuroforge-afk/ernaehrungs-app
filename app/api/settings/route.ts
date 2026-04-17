import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { validateBody, settingsSchema } from "@/lib/validations";
import { checkRateLimit, settingsLimiter } from "@/lib/rate-limit";

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

  const rl = await checkRateLimit(settingsLimiter, userId);
  if (!rl.success) {
    return new Response(
      JSON.stringify({ error: "rate_limited", message: "Zu viele Änderungen. Bitte warte kurz." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const rawBody = await request.json();
  const validation = validateBody(settingsSchema, rawBody);
  if (!validation.success) {
    return new Response(
      JSON.stringify({ error: "invalid_input", message: validation.error }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const body = validation.data;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.notification_preferences) {
    const p = body.notification_preferences;
    const sanitized: NotificationPreferences = {
      tagebuch_reminder: {
        enabled: !!p.tagebuch_reminder?.enabled,
        time:
          typeof p.tagebuch_reminder?.time === "string"
            ? p.tagebuch_reminder.time
            : "20:00",
      },
      review_reminder: { enabled: !!p.review_reminder?.enabled },
      credit_warning_email: {
        enabled: p.credit_warning_email?.enabled ?? true,
      },
    };
    update.notification_preferences = sanitized;
  }

  if (body.theme) {
    update.theme = body.theme;
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("ea_users")
    .update(update)
    .eq("clerk_id", userId);

  if (error) {
    console.error("[settings] db error:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500 });
  }

  // Email preferences are read from ea_users at send-time by the cron jobs
  // (weekly-reminder, inactive-accounts) and by deductCredits(), so a DB
  // update is the sync — no Resend audience list to maintain.

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
