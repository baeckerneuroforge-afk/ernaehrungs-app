import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { loadUserBehaviorContext } from "@/lib/utils/user-context";
import { deductCredits, CREDIT_COSTS } from "@/lib/credits";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { PlanParameters } from "@/types/meal-plan";
import { MEAL_LABELS } from "@/types/meal-plan";

// ---------------------------------------------------------------------------
// 1. SYSTEM PROMPT – Structured JSON output
// ---------------------------------------------------------------------------
function buildMealPlanPrompt(params: PlanParameters): string {
  const mealLabels = MEAL_LABELS[params.mealsPerDay] || MEAL_LABELS[3];

  const timingBlock = params.flexibleTiming
    ? "Wähle passende Uhrzeiten basierend auf dem Profil und Fastenmodell."
    : Object.entries(params.timing)
        .map(([label, time]) => `- ${label}: ${time} Uhr`)
        .join("\n");

  const fastingBlock =
    params.fasting === "none"
      ? "Kein Intervallfasten."
      : `Fastenmodell: ${params.fasting}. Alle Mahlzeiten müssen innerhalb des Essensfensters liegen.`;

  const mealprepBlock = params.mealprep
    ? `Mealprep: Ja, für ${params.mealPrepDays || 3} Tage. Füge einen mealPrepPlan mit prepDay und tasks hinzu.`
    : "Mealprep: Nein. Lasse mealPrepPlan weg.";

  return `Du bist eine erfahrene Ernährungswissenschaftlerin und erstellst strukturierte, praxisnahe 7-Tage-Ernährungspläne als JSON.

## ABSOLUTE REGELN (NIEMALS brechen):

### Wissensbasis-Pflicht
- Verwende die bereitgestellte WISSENSBASIS als Grundlage für Empfehlungen.
- Erfinde KEINE Nährwertangaben oder gesundheitsbezogenen Fakten, die nicht in der Wissensbasis stehen.
- Rezepte basieren auf allgemeinem Ernährungswissen UND der Wissensbasis.

### Medizinische Grenze – HART
- Gib KEINE medizinischen Diagnosen, Medikamenten-Empfehlungen oder Therapievorschläge.
- Gib KEINE Empfehlungen zu Nahrungsergänzungsmitteln.
- Bei Krankheiten im Profil: Berücksichtige sie, aber erstelle trotzdem den Plan.
- Erstelle KEINE Pläne unter 1200 kcal/Tag.

### Eskalation
Bei Essstörungen, Extremdiäten unter 800 kcal, Schwangerschaft/Stillzeit, Kinder unter 12: Erstelle KEINEN Plan.

### Output-Format
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Markdown, kein Text drumherum, nur JSON.

## PARAMETER:
- ${fastingBlock}
- Mahlzeiten pro Tag: ${params.mealsPerDay} (${mealLabels.join(", ")})
- Timing:
${timingBlock}
- ${mealprepBlock}
${params.userMessage ? `- Individuelle Wünsche: ${params.userMessage}` : ""}

## JSON-STRUKTUR (exakt einhalten):
{
  "weekPlan": [
    {
      "day": "Montag",
      "meals": [
        {
          "type": "${mealLabels[0]}",
          "time": "08:00",
          "name": "Rezeptname",
          "shortDescription": "Kurzbeschreibung (max 60 Zeichen)",
          "calories": 450,
          "fullRecipe": {
            "ingredients": ["200g Haferflocken", "1 Banane", ...],
            "steps": ["Haferflocken in Milch kochen", ...],
            "prepTime": "10 Min",
            "mealPrepNote": "Kann am Vorabend vorbereitet werden"
          }
        }
      ]
    }
  ],
  "shoppingList": ["500g Haferflocken", "7 Bananen", ...],
  "mealPrepPlan": {
    "prepDay": "Sonntag",
    "tasks": ["Reis für 3 Tage kochen", "Gemüse schneiden und portionieren", ...]
  }
}

## REGELN FÜR DEN INHALT:
- 7 Tage: Montag bis Sonntag
- Jeder Tag hat exakt ${params.mealsPerDay} Mahlzeiten mit den types: ${mealLabels.map((l) => `"${l}"`).join(", ")}
- "time" ist die Uhrzeit im Format "HH:MM"
- "calories" ist eine realistische Schätzung pro Mahlzeit
- "shortDescription" max 60 Zeichen, beschreibt das Gericht kurz
- "ingredients" mit Mengenangaben
- "steps" als klare Zubereitungsschritte
- "prepTime" als geschätzte Zubereitungszeit
- "mealPrepNote" nur wenn relevant (kann Mahlzeit vorbereitet werden?)
- "shoppingList" ist eine aggregierte Einkaufsliste für die ganze Woche mit Mengen
- Allergien aus dem Profil sind ABSOLUTE No-Gos
- Berücksichtige Ernährungsform strikt (vegan = keine tierischen Produkte etc.)
${params.mealprep ? '- "mealPrepPlan" MUSS vorhanden sein mit prepDay und tasks' : '- KEIN "mealPrepPlan" im Output'}`;
}

// ---------------------------------------------------------------------------
// 2. ESKALATIONS-CHECK
// ---------------------------------------------------------------------------
const ESCALATION_PATTERNS = [
  /\b(magersucht|bulimie|binge.?eating|essst[öo]rung|anorexie|purging)\b/i,
  /\b(suizid|selbstmord|umbringen|selbstverletz|ritzen|nicht.+leben)\b/i,
  /\b(anaphyla|notarzt|notaufnahme|bewusstlos|atemnot|schock)\b/i,
];

const ESCALATION_JSON = JSON.stringify({
  error: "escalation",
  message:
    "Bei diesem Thema kann ich leider keinen Ernährungsplan erstellen. Bitte wende dich an Fachpersonal.",
});

// ---------------------------------------------------------------------------
// Helper: Static SSE response
// ---------------------------------------------------------------------------
function streamStaticResponse(text: string): Response {
  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`)
      );
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
      );
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ---------------------------------------------------------------------------
// 3. ROUTE HANDLER
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const { planParameters } = (await request.json()) as {
      planParameters: PlanParameters;
    };

    // Escalation check on user message
    if (
      planParameters.userMessage &&
      ESCALATION_PATTERNS.some((p) => p.test(planParameters.userMessage!))
    ) {
      return streamStaticResponse(ESCALATION_JSON);
    }

    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Credit check & deduction
    const hasCredits = await deductCredits(
      userId,
      CREDIT_COSTS.plan_generation,
      "plan_generation",
      "Ernährungsplan generiert"
    );
    if (!hasCredits) {
      return new Response(
        JSON.stringify({ error: "insufficient_credits" }),
        { status: 402 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Load profile + behavior context in parallel
    const [profileResult, behaviorContext] = await Promise.all([
      supabase
        .from("ea_profiles")
        .select("*")
        .eq("user_id", userId)
        .limit(1),
      loadUserBehaviorContext(supabase, userId),
    ]);

    const p = profileResult.data?.[0];
    const profilParts: string[] = [];

    if (p) {
      if (p.alter_jahre) profilParts.push(`Alter: ${p.alter_jahre} Jahre`);
      if (p.geschlecht) profilParts.push(`Geschlecht: ${p.geschlecht}`);
      if (p.groesse_cm) profilParts.push(`Größe: ${p.groesse_cm} cm`);
      if (p.gewicht_kg) profilParts.push(`Gewicht: ${p.gewicht_kg} kg`);
      if (p.ziel) profilParts.push(`Ziel: ${p.ziel}`);
      if (p.allergien?.length)
        profilParts.push(
          `Allergien/Unverträglichkeiten: ${p.allergien.join(", ")}`
        );
      if (p.ernaehrungsform)
        profilParts.push(`Ernährungsform: ${p.ernaehrungsform}`);
      if (p.krankheiten)
        profilParts.push(`Besonderheiten: ${p.krankheiten}`);
      if (p.aktivitaet)
        profilParts.push(`Aktivitätslevel: ${p.aktivitaet}`);
    }

    // ---- RAG: Vector search with confidence scoring ----
    let knowledgeContext = "";
    let ragConfidence: "high" | "low" | "none" = "none";

    try {
      const ragQuery =
        `Ernährungsplan 7 Tage ${p?.ernaehrungsform || ""} ${p?.allergien?.join(" ") || ""} ${p?.ziel || ""} ${p?.krankheiten || ""} ${planParameters.fasting !== "none" ? planParameters.fasting : ""}`.trim();

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: ragQuery,
      });

      const { data: docs } = await supabase.rpc("ea_match_documents", {
        query_embedding: JSON.stringify(
          embeddingResponse.data[0].embedding
        ),
        match_threshold: 0.3,
        match_count: 5,
      });

      if (docs?.length) {
        const avgSimilarity =
          docs.reduce(
            (sum: number, d: { similarity: number }) => sum + d.similarity,
            0
          ) / docs.length;

        if (avgSimilarity >= 0.45) ragConfidence = "high";
        else if (avgSimilarity >= 0.3) ragConfidence = "low";

        knowledgeContext = docs
          .map(
            (d: { title: string; content: string; similarity: number }) =>
              `[${d.title}] (Relevanz: ${Math.round(d.similarity * 100)}%)\n${d.content}`
          )
          .join("\n\n---\n\n");
      }
    } catch (e) {
      console.error("RAG search error:", e);
    }

    // ---- Build system prompt ----
    let systemPrompt = buildMealPlanPrompt(planParameters);

    if (profilParts.length) {
      systemPrompt += `\n\nNUTZERPROFIL:\n${profilParts.join("\n")}`;
    }

    if (behaviorContext) {
      systemPrompt += `\n\n${behaviorContext}`;
      systemPrompt += `\n\nHINWEIS: Nutze Ernährungstagebuch und Gewichtsverlauf, um den Plan an das tatsächliche Essverhalten anzupassen.`;
    }

    if (knowledgeContext) {
      systemPrompt += `\n\nWISSENSBASIS:\n${knowledgeContext}`;
    }

    if (ragConfidence === "low") {
      systemPrompt += `\n\n⚠️ ACHTUNG: Die Relevanz der gefundenen Dokumente ist NIEDRIG. Halte dich besonders strikt an allgemein anerkannte Ernährungsempfehlungen.`;
    }
    if (ragConfidence === "none") {
      systemPrompt += `\n\n⚠️ Keine spezifischen Dokumente in der Wissensbasis gefunden. Erstelle den Plan basierend auf allgemein anerkannten Ernährungsempfehlungen.`;
    }

    const userMessage = `Erstelle einen strukturierten 7-Tage-Ernährungsplan als JSON. Antworte NUR mit dem JSON-Objekt.`;

    // Stream response
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const encoder = new TextEncoder();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for future plan-saving in stream
    let fullContent = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const messageStream = await stream;
          for await (const event of messageStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              fullContent += event.delta.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`
                )
              );
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done" })}\n\n`
            )
          );
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: "Generierung fehlgeschlagen" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Meal plan error:", error);
    return new Response(JSON.stringify({ error: "Server-Fehler" }), {
      status: 500,
    });
  }
}
