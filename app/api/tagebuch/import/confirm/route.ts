import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/feature-gates-server";
import { hasFeatureAccess } from "@/lib/feature-gates";
import { NextResponse } from "next/server";

interface ImportEntry {
  datum?: string;
  name?: string;
  kalorien?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  mahlzeit_typ?: string | null;
  externe_quelle?: string;
  externe_id?: string;
}

/**
 * POST /api/tagebuch/import/confirm
 * Premium-only: Confirm and insert parsed CSV entries into ea_food_log.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getUserPlan(userId);
  if (!hasFeatureAccess(plan, "csv_import")) {
    return NextResponse.json(
      { error: "premium_required" },
      { status: 403 }
    );
  }

  let body: { entries?: ImportEntry[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.entries?.length) {
    return NextResponse.json({ error: "no_entries" }, { status: 400 });
  }

  const VALID_TYPES = new Set(["fruehstueck", "mittag", "abend", "snack"]);

  const toInsert = body.entries.slice(0, 1000).map((e) => ({
    user_id: userId,
    beschreibung: (e.name || "Importierter Eintrag").slice(0, 1000),
    kalorien_geschaetzt: typeof e.kalorien === "number" ? Math.round(e.kalorien) : null,
    protein_g: typeof e.protein === "number" ? Math.round(e.protein * 10) / 10 : null,
    carbs_g: typeof e.carbs === "number" ? Math.round(e.carbs * 10) / 10 : null,
    fat_g: typeof e.fat === "number" ? Math.round(e.fat * 10) / 10 : null,
    mahlzeit_typ: e.mahlzeit_typ && VALID_TYPES.has(e.mahlzeit_typ) ? e.mahlzeit_typ : "snack",
    externe_quelle: (e.externe_quelle || "csv_import").slice(0, 50),
    externe_id: e.externe_id?.slice(0, 200) || null,
    datum: e.datum && /^\d{4}-\d{2}-\d{2}$/.test(e.datum) ? e.datum : new Date().toISOString().split("T")[0],
    source: "manual" as const,
  }));

  const supabase = createSupabaseAdmin();

  // Insert in batches of 200 to avoid payload size issues
  let imported = 0;
  for (let i = 0; i < toInsert.length; i += 200) {
    const batch = toInsert.slice(i, i + 200);
    const { error } = await supabase.from("ea_food_log").insert(batch);
    if (error) {
      console.error("[import/confirm] Insert batch failed:", error);
      // Continue with remaining batches
    } else {
      imported += batch.length;
    }
  }

  return NextResponse.json({ imported });
}
