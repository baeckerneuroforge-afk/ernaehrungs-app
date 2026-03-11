import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const datum = url.searchParams.get("datum") || new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("ea_food_log")
    .select("*")
    .eq("user_id", user.id)
    .eq("datum", datum)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { mahlzeit_typ, beschreibung, kalorien_geschaetzt, datum } = body;

  if (!mahlzeit_typ || !beschreibung) {
    return NextResponse.json({ error: "mahlzeit_typ und beschreibung erforderlich" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ea_food_log")
    .insert({
      user_id: user.id,
      mahlzeit_typ,
      beschreibung,
      kalorien_geschaetzt: kalorien_geschaetzt || null,
      datum: datum || new Date().toISOString().split("T")[0],
    })
    .select()
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.[0]);
}
