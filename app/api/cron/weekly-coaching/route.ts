import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/email-templates";
import { hasKiConsent } from "@/lib/consent";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Weekly coaching cron. Runs every Monday at 07:00 UTC (09:00 CET).
 * Generates 3 personalized coaching tips for each premium (pro_plus) user
 * based on their last week's data, then sends via email.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  const { data: premiumUsers, error } = await supabase
    .from("ea_users")
    .select("clerk_id, email, name")
    .in("subscription_plan", ["pro_plus"]);

  if (error || !premiumUsers) {
    console.error("[coaching] Could not load premium users:", error);
    return NextResponse.json({ ok: true, sent: 0, failed: 0 });
  }

  let sent = 0;
  let failed = 0;
  let skippedNoConsent = 0;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const user of premiumUsers) {
    try {
      const userId = user.clerk_id;

      // DSGVO: User könnte Consent zwischen Subscription-Aktivierung und Cron-Lauf widerrufen haben.
      if (!(await hasKiConsent(supabase, userId))) {
        skippedNoConsent++;
        continue;
      }

      const [profileRes, foodRes, weightRes, goalsRes] = await Promise.all([
        supabase
          .from("ea_profiles")
          .select("name, ziel, ernaehrungsform, allergien, gewicht_kg, calorie_target")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("ea_food_log")
          .select("beschreibung, kalorien_geschaetzt, datum")
          .eq("user_id", userId)
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: true }),
        supabase
          .from("ea_weight_logs")
          .select("gewicht_kg, gemessen_am")
          .eq("user_id", userId)
          .gte("created_at", sevenDaysAgo)
          .order("gemessen_am", { ascending: true }),
        supabase
          .from("ea_ziele")
          .select("beschreibung, zielwert, einheit, erreicht")
          .eq("user_id", userId)
          .eq("erreicht", false),
      ]);

      const profile = profileRes.data;
      const foodLogs = foodRes.data || [];
      const weightLogs = weightRes.data || [];
      const goals = goalsRes.data || [];
      const userName = profile?.name || user.name || "dort";

      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: `Du bist Janines KI-Ernährungscoach bei Nutriva. Erstelle 3 kurze, konkrete Coaching-Tipps für die kommende Woche.

Basiere auf den Nutzerdaten. Maximal 150 Wörter gesamt. Persönlich, warm, motivierend.
Format: Begrüßung mit Vorname, dann 3 nummerierte Tipps, dann ein motivierender Closer.
Maximal 3 Emojis gesamt. Schreibe auf Deutsch, duze den Nutzer.

Wenn wenig Daten vorhanden sind, gib trotzdem allgemeine aber nützliche Tipps.

NUTZERPROFIL:
${JSON.stringify(profile || {})}

TAGEBUCH (letzte 7 Tage, ${foodLogs.length} Einträge):
${JSON.stringify(foodLogs.slice(0, 30))}

GEWICHT (letzte 7 Tage):
${JSON.stringify(weightLogs)}

AKTIVE ZIELE:
${JSON.stringify(goals)}`,
        messages: [{ role: "user", content: "Erstelle meine wöchentlichen Coaching-Tipps." }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const coachingText = textBlock && textBlock.type === "text" ? textBlock.text : "";

      if (user.email && coachingText) {
        const template = emailTemplates.weeklyCoaching(userName, coachingText);
        await sendEmail({
          to: user.email,
          subject: template.subject,
          html: template.html,
        });
        sent++;
        console.log(`[coaching] Sent to ${userId}`);
      }
    } catch (err) {
      console.error(`[coaching] Failed for ${user.clerk_id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, skippedNoConsent });
}
