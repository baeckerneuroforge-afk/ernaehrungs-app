import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, exportLimiter } from "@/lib/rate-limit";

// DSGVO Art. 20 — Datenportabilität. Lädt alle personenbezogenen Daten
// des Users in einem strukturierten JSON herunter.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limit: max 1 Export pro Stunde pro User (verhindert Missbrauch /
  // ungewollte Mehrfach-Downloads, ist legal trotzdem ausreichend häufig).
  const rl = await checkRateLimit(exportLimiter, userId);
  if (!rl.success) {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message:
          "Du kannst deine Daten nur einmal pro Stunde exportieren. Bitte versuche es später erneut.",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createSupabaseAdmin();

  const [
    profilResult,
    tagebuchResult,
    gewichtResult,
    plaeneResult,
    zieleResult,
    conversationsResult,
    messagesResult,
    creditsResult,
  ] = await Promise.all([
    supabase.from("ea_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("ea_food_log")
      .select("*")
      .eq("user_id", userId)
      .order("datum", { ascending: false }),
    supabase
      .from("ea_weight_logs")
      .select("*")
      .eq("user_id", userId)
      .order("gemessen_am", { ascending: false }),
    supabase
      .from("ea_meal_plans")
      .select("id, titel, parameters, plan_data, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("ea_ziele").select("*").eq("user_id", userId),
    supabase
      .from("ea_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("ea_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("ea_credit_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const payload = {
    exportiert_am: new Date().toISOString(),
    user_id: userId,
    profil: profilResult.data || null,
    tagebuch: tagebuchResult.data || [],
    gewicht: gewichtResult.data || [],
    plaene: plaeneResult.data || [],
    ziele: zieleResult.data || [],
    chats: {
      conversations: conversationsResult.data || [],
      messages: messagesResult.data || [],
    },
    credits: creditsResult.data || [],
  };

  const datum = new Date().toISOString().slice(0, 10);
  const filename = `nutriva-datenexport-${datum}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
