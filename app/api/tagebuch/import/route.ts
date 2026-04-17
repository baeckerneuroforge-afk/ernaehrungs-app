import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/feature-gates-server";
import { hasFeatureAccess } from "@/lib/feature-gates";
import { hasKiConsent, KI_CONSENT_MISSING_RESPONSE } from "@/lib/consent";
import { checkRateLimit, importLimiter } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/tagebuch/import
 * Premium-only: Upload a CSV file from nutrition apps. Claude Haiku parses the
 * format and extracts entries. Returns a preview for the user to confirm.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getUserPlan(userId);
  if (!hasFeatureAccess(plan, "csv_import")) {
    return NextResponse.json(
      { error: "premium_required", message: "CSV-Import ist im Premium-Plan verfügbar." },
      { status: 403 }
    );
  }

  // DSGVO Art. 6/7 — CSV wird von Claude Haiku geparst; ohne Einwilligung keine Verarbeitung.
  const supabaseForConsent = createSupabaseAdmin();
  if (!(await hasKiConsent(supabaseForConsent, userId))) {
    return NextResponse.json(KI_CONSENT_MISSING_RESPONSE, { status: 403 });
  }

  const rl = await checkRateLimit(importLimiter, userId);
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Maximal 5 Imports pro Stunde. Bitte warte etwas." },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_request", message: "Bitte sende eine Datei." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "no_file", message: "Keine Datei hochgeladen." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "file_too_large", message: "Datei darf maximal 5 MB groß sein." }, { status: 400 });
  }

  const csvText = await file.text();
  const lines = csvText.split("\n").filter((l) => l.trim());

  if (lines.length < 2) {
    return NextResponse.json({ error: "empty_file", message: "Die Datei enthält keine Daten." }, { status: 400 });
  }

  if (lines.length > 1000) {
    return NextResponse.json({ error: "too_many_rows", message: "Maximal 1.000 Einträge pro Import." }, { status: 400 });
  }

  // Claude Haiku parses the CSV structure
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 16000,
      system: `Du bist ein CSV-Parser für Ernährungs-Apps. Du analysierst CSV-Dateien und extrahierst Mahlzeiten-Daten.

Antworte NUR mit einem JSON-Objekt, kein Markdown, kein Text davor oder danach.

Deine Aufgabe:
1. Erkenne die Spalten-Zuordnung (welche Spalte = Datum, Name, Kalorien, Protein, Kohlenhydrate, Fett, Mahlzeit-Typ)
2. Erkenne das Datumsformat und konvertiere ALLE Daten ins Format YYYY-MM-DD
3. Erkenne den CSV-Separator (Komma, Semikolon, Tab)
4. Parse ALLE Datenzeilen

Bekannte App-Formate:
- MyFitnessPal: Date, Meal, Food, Calories, Fat (g), Carbs (g), Protein (g)
- Yazio: Datum, Mahlzeit, Lebensmittel, Energie (kcal), Eiweiß (g), Kohlenhydrate (g), Fett (g)
- Lifesum: Date, Meal type, Title, Energy (kcal), Protein (g), Carbs (g), Fat (g)
- FDDB: Datum, Produkt, kcal, Eiweiß, Kohlenhydrate, Fett
- Cronometer: Date, Food Name, Energy (kcal), Protein (g), Carbs (g), Fat (g), Category

Mahlzeit-Typen normalisieren zu: fruehstueck, mittag, abend, snack
- Breakfast/Frühstück/Morning → fruehstueck
- Lunch/Mittagessen/Mittag → mittag
- Dinner/Abendessen/Abend → abend
- Snack/Snacks/Zwischenmahlzeit → snack
- Wenn kein Typ vorhanden: null

Antwort-Format:
{
  "detected_app": "myfitnesspal" | "yazio" | "lifesum" | "fddb" | "cronometer" | "unknown",
  "entries": [
    {
      "datum": "2026-04-14",
      "name": "Haferflocken mit Banane",
      "kalorien": 420,
      "protein": 12,
      "carbs": 68,
      "fat": 9,
      "mahlzeit_typ": "fruehstueck"
    }
  ]
}`,
      messages: [
        {
          role: "user",
          content: `Analysiere diese CSV-Datei und parse ALLE Einträge:\n\n${csvText}`,
        },
      ],
    });
  } catch (err) {
    console.error("[import] Claude API error:", err);
    return NextResponse.json(
      { error: "analysis_failed", message: "Analyse fehlgeschlagen. Bitte versuche es erneut." },
      { status: 500 }
    );
  }

  const textBlock = response.content.find((b) => b.type === "text");
  const responseText = textBlock && textBlock.type === "text" ? textBlock.text : "";

  let parsed: { detected_app?: string; entries?: Array<{
    datum?: string; name?: string; kalorien?: number;
    protein?: number; carbs?: number; fat?: number; mahlzeit_typ?: string | null;
  }> };
  try {
    const clean = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const match = clean.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : clean);
  } catch {
    return NextResponse.json(
      { error: "parse_failed", message: "Die Datei konnte nicht analysiert werden. Bitte prüfe das Format." },
      { status: 422 }
    );
  }

  if (!parsed.entries?.length) {
    return NextResponse.json(
      { error: "no_entries", message: "Keine Einträge in der Datei erkannt." },
      { status: 422 }
    );
  }

  // Build entries with dedup IDs
  const entries = parsed.entries.map((e) => ({
    ...e,
    externe_id: `${e.datum || ""}_${e.name || ""}_${e.kalorien || 0}`
      .replace(/\s+/g, "_")
      .toLowerCase()
      .slice(0, 200),
    externe_quelle: parsed.detected_app || "csv_import",
  }));

  // Dedup check against existing imports
  const supabase = createSupabaseAdmin();
  const externeIds = entries.map((e) => e.externe_id);

  // Supabase .in() has a limit — batch if needed
  const batchSize = 100;
  const existingSet = new Set<string>();
  for (let i = 0; i < externeIds.length; i += batchSize) {
    const batch = externeIds.slice(i, i + batchSize);
    const { data: existing } = await supabase
      .from("ea_food_log")
      .select("externe_id")
      .eq("user_id", userId)
      .in("externe_id", batch);
    if (existing) {
      for (const row of existing) {
        if (row.externe_id) existingSet.add(row.externe_id);
      }
    }
  }

  const newEntries = entries.filter((e) => !existingSet.has(e.externe_id));
  const duplicateCount = entries.length - newEntries.length;

  return NextResponse.json({
    detected_app: parsed.detected_app || "unknown",
    total: entries.length,
    new: newEntries.length,
    duplicates: duplicateCount,
    preview: newEntries.slice(0, 10),
    entries: newEntries,
  });
}
