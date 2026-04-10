import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { hasFeatureAccess } from "@/lib/feature-gates";
import { getUserPlan } from "@/lib/feature-gates-server";
import { deductCredits, CREDIT_COSTS } from "@/lib/credits";
import { hasKiConsent } from "@/lib/consent";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ANALYSIS_PROMPT = `Analysiere dieses Foto einer Mahlzeit. Schätze:

- Was auf dem Bild zu sehen ist (Gericht, Zutaten)
- Geschätzte Kalorien (kcal)
- Geschätzte Makronährstoffe (Protein in g, Kohlenhydrate in g, Fett in g)
- Portionsgröße

Antworte auf Deutsch. Sei ehrlich wenn du unsicher bist — lieber eine Spanne (z.B. "400-500 kcal") als eine falsche Zahl.

Antworte AUSSCHLIESSLICH als gültiges JSON ohne Markdown-Codeblock, ohne erklärenden Text davor oder danach:
{
  "dish": "Name des Gerichts",
  "calories": 450,
  "protein": 30,
  "carbs": 50,
  "fat": 15,
  "portion": "1 Teller",
  "confidence": "sicher" | "mittel" | "unsicher"
}

Wenn du auf dem Bild keine Mahlzeit erkennst, gib ein JSON zurück mit "dish": "" und "confidence": "unsicher".`;

type Analysis = {
  dish: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  portion: string;
  confidence: "sicher" | "mittel" | "unsicher";
};

function parseAnalysisJson(raw: string): Analysis | null {
  // Strip markdown fences if Claude still wraps the JSON
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const match = cleaned.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : cleaned;
    const parsed = JSON.parse(jsonText);
    return {
      dish: typeof parsed.dish === "string" ? parsed.dish : "",
      calories: typeof parsed.calories === "number" ? parsed.calories : null,
      protein: typeof parsed.protein === "number" ? parsed.protein : null,
      carbs: typeof parsed.carbs === "number" ? parsed.carbs : null,
      fat: typeof parsed.fat === "number" ? parsed.fat : null,
      portion: typeof parsed.portion === "string" ? parsed.portion : "",
      confidence:
        parsed.confidence === "sicher" ||
        parsed.confidence === "mittel" ||
        parsed.confidence === "unsicher"
          ? parsed.confidence
          : "mittel",
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // KI-Consent (Art. 9 Abs. 2 lit. a DSGVO)
  if (!(await hasKiConsent(supabase, userId))) {
    return NextResponse.json(
      { error: "ki_consent_missing", message: "Bitte erlaube die KI-Nutzung in deinen Einstellungen." },
      { status: 403 }
    );
  }

  // Premium-Gate: Foto-Tracking ist pro_plus/admin only
  const plan = await getUserPlan(userId);
  if (!hasFeatureAccess(plan, "foto_tracking")) {
    return NextResponse.json(
      {
        error: "feature_locked",
        message: "Foto-Tracking ist im Premium-Plan verfügbar.",
      },
      { status: 403 }
    );
  }

  // Parse multipart
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const image = formData.get("image");
  if (!image || !(image instanceof File)) {
    return NextResponse.json({ error: "Kein Bild übergeben" }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  type AllowedMedia = (typeof allowed)[number];
  if (!allowed.includes(image.type as AllowedMedia)) {
    return NextResponse.json(
      { error: "Nur JPEG, PNG, WEBP oder GIF erlaubt." },
      { status: 400 }
    );
  }

  // Size cap (5 MB)
  if (image.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Bild zu groß (max. 5 MB)." },
      { status: 400 }
    );
  }

  // Credits abziehen BEVOR wir Anthropic anrufen
  const ok = await deductCredits(
    userId,
    CREDIT_COSTS.foto_analysis,
    "foto_analysis",
    "Foto-Analyse (Sonnet Vision)"
  );
  if (!ok) {
    return NextResponse.json(
      {
        error: "insufficient_credits",
        message:
          "Nicht genügend Credits für eine Foto-Analyse. Bitte lade Credits nach.",
      },
      { status: 402 }
    );
  }

  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mediaType = image.type as AllowedMedia;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            { type: "text", text: ANALYSIS_PROMPT },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawText = textBlock && textBlock.type === "text" ? textBlock.text : "";

    const analysis = parseAnalysisJson(rawText);
    if (!analysis) {
      return NextResponse.json(
        {
          error: "parse_failed",
          message: "Konnte die Analyse nicht lesen. Bitte erneut versuchen.",
          raw: rawText,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Foto-Analyse Fehler:", err);
    return NextResponse.json(
      { error: "analysis_failed", message: "Analyse fehlgeschlagen." },
      { status: 500 }
    );
  }
}
