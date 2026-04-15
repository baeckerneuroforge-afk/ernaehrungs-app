import { auth } from "@clerk/nextjs/server";
import { getUserPlan } from "@/lib/feature-gates-server";
import { hasFeatureAccess } from "@/lib/feature-gates";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/scanner/lookup?barcode=xxx
 * Premium-only: Lookup a barcode via Open Food Facts API.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getUserPlan(userId);
  if (!hasFeatureAccess(plan, "barcode_scanner")) {
    return NextResponse.json(
      { error: "premium_required", message: "Der Barcode-Scanner ist im Premium-Plan verfügbar." },
      { status: 403 }
    );
  }

  const barcode = req.nextUrl.searchParams.get("barcode");
  if (!barcode || !/^\d{4,14}$/.test(barcode)) {
    return NextResponse.json({ error: "missing_barcode" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      { next: { revalidate: 86400 } } // cache 24h
    );
    const data = await res.json();

    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ product: null });
    }

    const p = data.product;
    const n = p.nutriments || {};

    return NextResponse.json({
      product: {
        name: p.product_name_de || p.product_name || "Unbekanntes Produkt",
        brand: p.brands || null,
        barcode,
        calories: Math.round(n["energy-kcal_100g"] || 0),
        protein: Math.round((n.proteins_100g || 0) * 10) / 10,
        carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
        fat: Math.round((n.fat_100g || 0) * 10) / 10,
        fiber: Math.round((n.fiber_100g || 0) * 10) / 10,
        sugar: Math.round((n.sugars_100g || 0) * 10) / 10,
        salt: Math.round((n.salt_100g || 0) * 100) / 100,
        image: p.image_front_small_url || null,
        nutriscore: p.nutriscore_grade || null,
      },
    });
  } catch (err) {
    console.error("[scanner] Lookup failed:", err);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
}
