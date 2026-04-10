import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  const url = new URL(request.url);
  const datum = url.searchParams.get("datum") || new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("ea_food_log")
    .select("*")
    .eq("user_id", userId)
    .eq("datum", datum)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  const body = await request.json();
  const {
    mahlzeit_typ,
    beschreibung,
    kalorien_geschaetzt,
    protein_g,
    carbs_g,
    fat_g,
    uhrzeit,
    source,
    photo_url,
    datum,
  } = body;

  if (!mahlzeit_typ || !beschreibung) {
    return NextResponse.json({ error: "mahlzeit_typ und beschreibung erforderlich" }, { status: 400 });
  }

  const toNum = (v: unknown) =>
    v === null || v === undefined || v === "" ? null : Number(v);

  const { data, error } = await supabase
    .from("ea_food_log")
    .insert({
      user_id: userId,
      mahlzeit_typ,
      beschreibung,
      kalorien_geschaetzt: toNum(kalorien_geschaetzt),
      protein_g: toNum(protein_g),
      carbs_g: toNum(carbs_g),
      fat_g: toNum(fat_g),
      uhrzeit: uhrzeit || null,
      source: source === "photo" ? "photo" : "manual",
      photo_url: photo_url || null,
      datum: datum || new Date().toISOString().split("T")[0],
    })
    .select()
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.[0]);
}
