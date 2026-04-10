import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
import { hasFeatureAccess } from "@/lib/feature-gates";
import { getUserPlan } from "@/lib/feature-gates-server";
import { deductCredits, CREDIT_COSTS } from "@/lib/credits";
import { hasKiConsent } from "@/lib/consent";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { calculateTDEE } from "@/lib/tdee";

console.log("[foto-analyze] MODULE LOADED");

// Node runtime für Buffer, randomUUID, und um Edge-Runtime-Limits
// (wie z.B. das harte 4 MB Request-Body-Limit) zu vermeiden.
export const runtime = "nodejs";
// Claude Vision braucht gerne 5-15s. Hobby-Default ist 10s → Timeout.
// Wir setzen 60s (max auf Hobby-Plan ist 10, auf Pro 60).
export const maxDuration = 60;
// Vercel Serverless hat ein default 4.5 MB Body-Cap auf Route-Handlers.
// Wir erwarten ohnehin <1 MB dank Client-Komprimierung; das Cap ist
// trotzdem explizit gemacht.
export const dynamic = "force-dynamic";

function buildAnalysisPrompt(userCtx: {
  ziel?: string | null;
  aktivitaet?: string | null;
  target?: number | null;
  goalLabel?: string | null;
}): string {
  const profileLine = userCtx.target
    ? `Der Nutzer hat folgendes Profil: Ziel "${userCtx.goalLabel || userCtx.ziel || "unbekannt"}", Aktivität "${userCtx.aktivitaet || "unbekannt"}", Tagesbedarf ca. ${userCtx.target} kcal.
Ordne die Mahlzeit als "dailyBudgetPercent" ein — also wie viel Prozent des Tagesbedarfs diese Mahlzeit ausmacht (gerundet, z.B. 25, 30, 45).`
    : `Kein Profil bekannt. Setze dailyBudgetPercent auf null.`;

  return `Analysiere dieses Foto einer Mahlzeit. Schätze:

- Was auf dem Bild zu sehen ist (Gericht, Zutaten)
- Geschätzte Kalorien (kcal)
- Geschätzte Makronährstoffe (Protein in g, Kohlenhydrate in g, Fett in g)
- Portionsgröße (inkl. ungefährem Gewicht in g wenn möglich)

WICHTIG bei der Kalorienschätzung:
- Berücksichtige IMMER nicht sichtbares Bratfett, Öl, Butter und Saucen. Gebratenes Fleisch/Fisch: +80-150 kcal für Bratfett. Röstkartoffeln/Bratkartoffeln: +100 kcal für Öl. Salat mit Dressing: +100-150 kcal. Pasta mit Sahne-/Käse-Sauce: +150-250 kcal versteckt.
- Schätze eher leicht ÜBER dem Minimum als darunter — die meisten Menschen unterschätzen Kalorien systematisch.
- Portionsgrößen auf Fotos wirken kleiner als sie sind. Ein voller Teller hat typisch 400-600g Essen, nicht 250g.
- Gib die Kalorien als EINZELNE Zahl (dein bester Schätz-Wert), NICHT als Spanne.

${profileLine}

Gib zusätzlich einen kurzen, konkreten "tip" (1 Satz, auf Deutsch, max 140 Zeichen) — entweder ein Hinweis auf versteckte Kalorien, eine positive Beobachtung (gute Proteinquelle etc.) oder einen Einordnungs-Satz zur Mahlzeit.

Antworte AUSSCHLIESSLICH als gültiges JSON ohne Markdown-Codeblock, ohne erklärenden Text davor oder danach:
{
  "dish": "Name des Gerichts",
  "calories": 780,
  "protein": 42,
  "carbs": 55,
  "fat": 38,
  "portion": "1 Teller, ca. 450g",
  "confidence": "sicher" | "mittel" | "unsicher",
  "dailyBudgetPercent": 30,
  "tip": "Gute Proteinquelle! Die Röstkartoffeln bringen durch das Bratfett mehr Kalorien mit als man denkt."
}

Wenn du auf dem Bild keine Mahlzeit erkennst, gib ein JSON zurück mit "dish": "", "confidence": "unsicher" und "tip": "Auf dem Bild ist keine Mahlzeit erkennbar."`;
}

type Analysis = {
  dish: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  portion: string;
  confidence: "sicher" | "mittel" | "unsicher";
  dailyBudgetPercent: number | null;
  tip: string;
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
      dailyBudgetPercent:
        typeof parsed.dailyBudgetPercent === "number"
          ? Math.round(parsed.dailyBudgetPercent)
          : null,
      tip: typeof parsed.tip === "string" ? parsed.tip.slice(0, 200) : "",
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  console.log("[foto-analyze] REQUEST RECEIVED", {
    contentType: request.headers.get("content-type"),
    contentLength: request.headers.get("content-length"),
    ua: request.headers.get("user-agent")?.slice(0, 80),
  });

  const { userId } = await auth();
  if (!userId) {
    console.warn("[foto-analyze] 401 no userId");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[foto-analyze] step: auth ok", { userId });

  // Env-Var-Check direkt nach auth — dann sehen wir Misskonfig sofort
  // bevor wir Credits verbrennen.
  const envMissing: string[] = [];
  if (!process.env.ANTHROPIC_API_KEY) envMissing.push("ANTHROPIC_API_KEY");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) envMissing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) envMissing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (envMissing.length) {
    console.error("[foto-analyze] ENV VARS MISSING:", envMissing);
    return NextResponse.json(
      {
        error: "server_misconfigured",
        message: `Server-Config fehlt: ${envMissing.join(", ")}`,
        missing: envMissing,
      },
      { status: 500 }
    );
  }

  const supabase = createSupabaseAdmin();

  // KI-Consent (Art. 9 Abs. 2 lit. a DSGVO)
  if (!(await hasKiConsent(supabase, userId))) {
    console.warn("[foto-analyze] 403 ki_consent_missing", { userId });
    return NextResponse.json(
      { error: "ki_consent_missing", message: "Bitte erlaube die KI-Nutzung in deinen Einstellungen." },
      { status: 403 }
    );
  }
  console.log("[foto-analyze] step: consent ok");

  // Premium-Gate: Foto-Tracking ist pro_plus/admin only
  const plan = await getUserPlan(userId);
  console.log("[foto-analyze] step: plan", { plan });
  if (!hasFeatureAccess(plan, "foto_tracking")) {
    console.warn("[foto-analyze] 403 feature_locked", { plan });
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
  } catch (err) {
    console.error("[foto-analyze] formData parse failed:", err);
    return NextResponse.json(
      { error: "invalid_form_data", message: "Formular-Daten ungültig.", detail: (err as Error)?.message },
      { status: 400 }
    );
  }

  const image = formData.get("image");
  if (!image || !(image instanceof File)) {
    console.warn("[foto-analyze] 400 no image", { hasImage: !!image, type: typeof image });
    return NextResponse.json({ error: "Kein Bild übergeben" }, { status: 400 });
  }
  console.log("[foto-analyze] step: image received", {
    size: image.size,
    type: image.type,
    name: image.name,
  });

  const allowed = ["image/jpeg", "image/png", "image/webp"] as const;
  type AllowedMedia = (typeof allowed)[number];
  if (!allowed.includes(image.type as AllowedMedia)) {
    console.warn("[foto-analyze] 400 invalid mime", { type: image.type });
    return NextResponse.json(
      { error: `Nur JPEG, PNG oder WEBP erlaubt. (erhalten: ${image.type || "leer"})` },
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
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mediaType =
      image.type === "image/png"
        ? "image/png"
        : image.type === "image/webp"
        ? "image/webp"
        : "image/jpeg";

    // Sanity-Check: base64-Prefix muss zum angegebenen media_type passen.
    // JPEG beginnt mit "/9j/", PNG mit "iVBOR", WEBP mit "UklGR".
    // Wenn der Browser HEIC durchgereicht hat oder die Datei kaputt ist,
    // lehnen wir HIER ab, statt Anthropic einen kaputten Stream zu füttern
    // (was dort als 500 zurückkommen würde).
    const prefix = base64.slice(0, 8);
    const looksLikeJpeg = base64.startsWith("/9j/");
    const looksLikePng = base64.startsWith("iVBOR");
    const looksLikeWebp = base64.startsWith("UklGR");
    const prefixMatchesType =
      (mediaType === "image/jpeg" && looksLikeJpeg) ||
      (mediaType === "image/png" && looksLikePng) ||
      (mediaType === "image/webp" && looksLikeWebp);

    console.log("[foto-analyze] step: buffer ready", {
      bytes: buffer.byteLength,
      base64Len: base64.length,
      mediaType,
      base64Prefix: prefix,
      prefixMatchesType,
    });

    if (!prefixMatchesType) {
      console.error("[foto-analyze] base64 prefix does not match media_type", {
        mediaType,
        prefix,
        looksLikeJpeg,
        looksLikePng,
        looksLikeWebp,
      });
      return NextResponse.json(
        {
          error: "invalid_image_data",
          message:
            "Das Bild ist beschädigt oder hat ein unerwartetes Format. Bitte ein anderes Foto wählen.",
          detail: `media_type=${mediaType} prefix=${prefix}`,
        },
        { status: 400 }
      );
    }

    // Profil + TDEE für Kontext laden. Fehler hier sind nicht kritisch —
    // dann läuft die Analyse ohne Profil-Kontext.
    const { data: profile } = await supabase
      .from("ea_profiles")
      .select(
        "gewicht_kg, groesse_cm, alter_jahre, geschlecht, aktivitaet, ziel, target_weight, target_timeframe"
      )
      .eq("user_id", userId)
      .maybeSingle();

    const tdee = profile ? calculateTDEE(profile) : null;
    console.log("[foto-analyze] step: profile loaded", {
      hasProfile: !!profile,
      target: tdee?.target || null,
    });

    const prompt = buildAnalysisPrompt({
      ziel: profile?.ziel,
      aktivitaet: profile?.aktivitaet,
      target: tdee?.target || null,
      goalLabel: tdee?.goalLabel || null,
    });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = "claude-sonnet-4-6";
    console.log("[foto-analyze] Calling Claude:", {
      model,
      mediaType,
      imageSize: base64.length,
    });
    const response = await anthropic.messages.create({
      model,
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
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    console.log("[foto-analyze] step: Claude responded", {
      stopReason: response.stop_reason,
      blocks: response.content.length,
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
      console.error("[foto-analyze] Storage-Upload fehlgeschlagen:", {
        message: uploadError.message,
        name: uploadError.name,
        path,
      });
      // Analyse trotzdem zurückgeben, nur ohne Foto-URL
    } else {
      console.log("[foto-analyze] step: uploaded to storage", { path });
      // Signed URL mit 1 Jahr Gültigkeit — Bucket ist privat.
      const { data: signed } = await supabase.storage
        .from("food-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      photo_url = signed?.signedUrl || null;
    }

    console.log("[foto-analyze] DONE", { userId, dish: analysis.dish, hasPhoto: !!photo_url });
    return NextResponse.json({ analysis, photo_url, photo_path: path });
  } catch (err) {
    const e = err as Error & { status?: number; error?: unknown };
    console.error("[foto-analyze] CAUGHT ERROR:", {
      name: e?.name,
      message: e?.message,
      status: e?.status,
      apiError: e?.error,
      stack: e?.stack,
    });
    return NextResponse.json(
      {
        error: "analysis_failed",
        message: `Analyse fehlgeschlagen: ${e?.message || "unbekannt"}`,
        detail: e?.message,
        name: e?.name,
        status: e?.status,
        apiError: e?.error,
      },
      { status: 500 }
    );
  }
}
