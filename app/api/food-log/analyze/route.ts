import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
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

  const allowed = ["image/jpeg", "image/png", "image/webp"] as const;
  type AllowedMedia = (typeof allowed)[number];
  if (!allowed.includes(image.type as AllowedMedia)) {
    return NextResponse.json(
      { error: "Nur JPEG, PNG oder WEBP erlaubt." },
      { status: 400 }
    );
  }

  // Size cap (10 MB) — der Client komprimiert bereits per Canvas auf
  // ~1600px / q0.85, das sind üblicherweise 300-800 KB. 10 MB ist nur
  // noch ein Safety-Net für den Fall, dass die Client-Komprimierung
  // fehlschlägt oder umgangen wird.
  if (image.size > 10 * 1024 * 1024) {
    console.warn("[foto-analyze] Bild zu groß:", image.size, "bytes");
    return NextResponse.json(
      { error: "Bild zu groß (max. 10 MB)." },
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
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("[foto-analyze] ANTHROPIC_API_KEY fehlt im Environment");
      return NextResponse.json(
        { error: "server_misconfigured", message: "Server nicht korrekt konfiguriert." },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString("base64");
    // Client komprimiert bereits auf JPEG via Canvas. Falls jemand
    // das umgeht (z.B. PNG-Upload von Desktop), akzeptieren wir den
    // Original-MIME-Type und reichen ihn an Claude weiter.
    const mediaType =
      image.type === "image/png"
        ? "image/png"
        : image.type === "image/webp"
        ? "image/webp"
        : "image/jpeg";

    console.log(
      "[foto-analyze] start",
      { userId, size: image.size, type: image.type }
    );

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

    // Upload compressed JPEG to Supabase Storage.
    // Path: {userId}/{datum}/{uuid}.jpg — datum kommt aus dem Request,
    // fallback auf heute. Wir wollen pro Tag gruppieren können.
    const datum =
      (formData.get("datum") as string | null) ||
      new Date().toISOString().split("T")[0];
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `${safeUserId}/${datum}/${randomUUID()}.jpg`;

    let photo_url: string | null = null;
    const { error: uploadError } = await supabase.storage
      .from("food-photos")
      .upload(path, buffer, {
        contentType: mediaType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage-Upload fehlgeschlagen:", uploadError);
      // Analyse trotzdem zurückgeben, nur ohne Foto-URL
    } else {
      // Signed URL mit 1 Jahr Gültigkeit — Bucket ist privat.
      const { data: signed } = await supabase.storage
        .from("food-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      photo_url = signed?.signedUrl || null;
    }

    console.log("[foto-analyze] done", { userId, dish: analysis.dish });
    return NextResponse.json({ analysis, photo_url, photo_path: path });
  } catch (err) {
    const e = err as Error;
    console.error("[foto-analyze] fehler:", {
      name: e?.name,
      message: e?.message,
      stack: e?.stack,
    });
    return NextResponse.json(
      {
        error: "analysis_failed",
        message: "Analyse fehlgeschlagen.",
        detail: process.env.NODE_ENV === "production" ? undefined : e?.message,
      },
      { status: 500 }
    );
  }
}
