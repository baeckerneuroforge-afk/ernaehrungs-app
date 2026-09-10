import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/feature-gates-server";
import { hasFeatureAccess } from "@/lib/feature-gates";
import { checkRateLimit, importLimiter } from "@/lib/rate-limit";
import { todayLocal } from "@/lib/local-date";
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

  const rl = await checkRateLimit(importLimiter, userId);
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Zu viele Imports. Bitte warte einen Moment." },
      { status: 429 }
    );
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

  // Reuse foodLogSchema bounds (kalorien 0-10000, makros 0-1000): out-of-range
  // or non-finite values become null instead of inserting absurd numbers.
  const boundInt = (v: unknown, max: number): number | null =>
    typeof v === "number" && isFinite(v) && v >= 0 && v <= max ? Math.round(v) : null;
  const bound1 = (v: unknown, max: number): number | null =>
    typeof v === "number" && isFinite(v) && v >= 0 && v <= max
      ? Math.round(v * 10) / 10
      : null;

  const toInsert = body.entries.slice(0, 1000).map((e) => {
    // Untrusted JSON: coerce ids/names safely (non-string .slice throws).
    const rawExtId = e.externe_id;
    const externe_id =
      rawExtId == null || rawExtId === ""
        ? null
        : String(rawExtId).slice(0, 200);
    const rawQuelle = e.externe_quelle;
    const externe_quelle = (
      typeof rawQuelle === "string" && rawQuelle.length > 0
        ? rawQuelle
        : "csv_import"
    ).slice(0, 50);
    const name =
      typeof e.name === "string" && e.name.length > 0
        ? e.name
        : "Importierter Eintrag";
    return {
      user_id: userId,
      beschreibung: name.slice(0, 1000),
      kalorien_geschaetzt: boundInt(e.kalorien, 10000),
      protein_g: bound1(e.protein, 1000),
      carbs_g: bound1(e.carbs, 1000),
      fat_g: bound1(e.fat, 1000),
      mahlzeit_typ:
        e.mahlzeit_typ && VALID_TYPES.has(e.mahlzeit_typ) ? e.mahlzeit_typ : "snack",
      externe_quelle,
      externe_id,
      datum:
        e.datum && /^\d{4}-\d{2}-\d{2}$/.test(e.datum) ? e.datum : todayLocal(),
      source: "manual" as const,
    };
  });

  const supabase = createSupabaseAdmin();

  // Skip rows whose externe_id was already imported for this user (re-submit).
  const externalIds = Array.from(
    new Set(
      toInsert
        .map((r) => r.externe_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );
  const existingIds = new Set<string>();
  if (externalIds.length > 0) {
    // Chunk .in() to stay under PostgREST URL limits.
    for (let i = 0; i < externalIds.length; i += 200) {
      const slice = externalIds.slice(i, i + 200);
      const { data: existing } = await supabase
        .from("ea_food_log")
        .select("externe_id")
        .eq("user_id", userId)
        .in("externe_id", slice);
      for (const row of existing || []) {
        if (row.externe_id) existingIds.add(row.externe_id);
      }
    }
  }
  const fresh = toInsert.filter(
    (r) => !r.externe_id || !existingIds.has(r.externe_id)
  );

  // Insert in batches of 200 to avoid payload size issues
  let imported = 0;
  for (let i = 0; i < fresh.length; i += 200) {
    const batch = fresh.slice(i, i + 200);
    const { error } = await supabase.from("ea_food_log").insert(batch);
    if (error) {
      console.error("[import/confirm] Insert batch failed:", error);
      // Continue with remaining batches
    } else {
      imported += batch.length;
    }
  }

  return NextResponse.json({
    imported,
    skipped_duplicates: toInsert.length - fresh.length,
  });
}
