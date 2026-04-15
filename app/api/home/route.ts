import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const todayStr = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [profileRes, todayFoodRes, weekFoodRes, weightRes, zieleRes, creditsRes, recentConvosRes, recentFoodRes, recentWeightRes, recentPlansRes] =
    await Promise.all([
      supabase
        .from("ea_profiles")
        .select("name, gewicht_kg, calorie_target, ziel")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("ea_food_log")
        .select("kalorien_geschaetzt")
        .eq("user_id", userId)
        .eq("datum", todayStr),
      supabase
        .from("ea_food_log")
        .select("id")
        .eq("user_id", userId)
        .gte("datum", sevenDaysAgo),
      supabase
        .from("ea_weight_logs")
        .select("gewicht_kg, gemessen_am")
        .eq("user_id", userId)
        .order("gemessen_am", { ascending: false })
        .limit(14),
      supabase
        .from("ea_ziele")
        .select("typ, beschreibung, zielwert, startwert, zieldatum")
        .eq("user_id", userId)
        .eq("erreicht", false),
      supabase
        .from("ea_users")
        .select("credits_subscription, credits_topup, subscription_plan")
        .eq("clerk_id", userId)
        .maybeSingle(),
      // Recent activity: last 3 conversations (first user message as title)
      supabase
        .from("ea_conversations")
        .select("session_id, content, role, created_at")
        .eq("user_id", userId)
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(10),
      // Recent food entries
      supabase
        .from("ea_food_log")
        .select("id, beschreibung, kalorien_geschaetzt, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),
      // Recent weight entries
      supabase
        .from("ea_weight_logs")
        .select("id, gewicht_kg, gemessen_am")
        .eq("user_id", userId)
        .order("gemessen_am", { ascending: false })
        .limit(2),
      // Recent meal plans
      supabase
        .from("ea_meal_plans")
        .select("id, titel, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  const profile = profileRes.data;
  const todayCalories =
    (todayFoodRes.data || []).reduce(
      (s, f) => s + (f.kalorien_geschaetzt || 0),
      0
    );
  const weekEntries = weekFoodRes.data?.length || 0;

  // Weight
  const weights = weightRes.data || [];
  const currentWeight = weights[0]?.gewicht_kg || profile?.gewicht_kg || null;
  const weekAgoWeight = weights.length >= 2 ? weights[Math.min(6, weights.length - 1)]?.gewicht_kg : null;
  const weightTrend =
    currentWeight && weekAgoWeight
      ? Math.round((currentWeight - weekAgoWeight) * 10) / 10
      : null;

  // Goal progress
  const gewichtsZiel =
    (zieleRes.data || []).find(
      (z) =>
        z.typ === "gewicht" ||
        z.beschreibung?.toLowerCase().includes("abnehm") ||
        z.beschreibung?.toLowerCase().includes("zunahm")
    ) || null;

  let progressPercent = 0;
  let remainingKg = 0;
  if (gewichtsZiel?.zielwert && gewichtsZiel?.startwert && currentWeight) {
    const total = Math.abs(gewichtsZiel.startwert - gewichtsZiel.zielwert);
    const done = Math.abs(gewichtsZiel.startwert - currentWeight);
    progressPercent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    remainingKg = Math.abs(currentWeight - gewichtsZiel.zielwert);
  }

  // Credits
  const credits =
    (creditsRes.data?.credits_subscription || 0) +
    (creditsRes.data?.credits_topup || 0);
  const plan = creditsRes.data?.subscription_plan || "free";

  // Recent activity — dedupe conversations by session_id, take first user message
  const seenSessions = new Set<string>();
  const recentChats: { type: string; title: string; time: string; link: string }[] = [];
  for (const c of recentConvosRes.data || []) {
    if (seenSessions.has(c.session_id)) continue;
    seenSessions.add(c.session_id);
    recentChats.push({
      type: "chat",
      title: (c.content || "Chat").slice(0, 60),
      time: c.created_at,
      link: "/chat",
    });
    if (recentChats.length >= 3) break;
  }

  const activities = [
    ...recentChats,
    ...(recentFoodRes.data || []).map((f) => ({
      type: "food",
      title: (f.beschreibung || "Eintrag").slice(0, 60),
      subtitle: f.kalorien_geschaetzt ? `${f.kalorien_geschaetzt} kcal` : undefined,
      time: f.created_at,
      link: "/tagebuch",
    })),
    ...(recentWeightRes.data || []).map((w) => ({
      type: "weight",
      title: `${w.gewicht_kg} kg eingetragen`,
      time: w.gemessen_am,
      link: "/tracker/gewicht",
    })),
    ...(recentPlansRes.data || []).map((p) => ({
      type: "plan",
      title: p.titel || "Ernährungsplan erstellt",
      time: p.created_at,
      link: "/ernaehrungsplan",
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

  return NextResponse.json({
    name: profile?.name || null,
    todayCalories,
    currentWeight,
    weightTrend,
    credits,
    plan,
    calorieTarget: profile?.calorie_target || null,
    weekEntries,
    gewichtsZiel,
    progressPercent,
    remainingKg: Math.round(remainingKg * 10) / 10,
    activities,
  });
}
