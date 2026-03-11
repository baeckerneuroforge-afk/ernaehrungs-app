import { createSupabaseServer } from "@/lib/supabase/server";
import { loadUserBehaviorContext } from "@/lib/utils/user-context";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// 1. SYSTEM PROMPT – RAG-basiert, keine Halluzination
// ---------------------------------------------------------------------------
const MEAL_PLAN_PROMPT = `Du bist eine erfahrene Ernährungswissenschaftlerin und erstellst strukturierte, praxisnahe Ernährungspläne. Du arbeitest auf Basis der bereitgestellten Wissensbasis.

## ABSOLUTE REGELN (NIEMALS brechen):

### Wissensbasis-Pflicht
- Verwende die bereitgestellte WISSENSBASIS als Grundlage für Empfehlungen.
- Wenn die Wissensbasis spezifische Empfehlungen zu Lebensmitteln, Nährstoffen oder Ernährungsformen enthält, NUTZE diese.
- Erfinde KEINE Nährwertangaben oder gesundheitsbezogenen Fakten, die nicht in der Wissensbasis stehen.
- Rezepte und Mahlzeiten basieren auf allgemeinem Ernährungswissen UND der Wissensbasis.

### Medizinische Grenze – HART
- Gib KEINE medizinischen Diagnosen, Medikamenten-Empfehlungen oder Therapievorschläge.
- Gib KEINE Empfehlungen zu Nahrungsergänzungsmitteln, Dosierungen oder Supplementen.
- Bei Krankheiten im Profil (Diabetes, Schilddrüse, Nierenerkrankungen, etc.):
  Berücksichtige sie bei der Planung, aber ergänze IMMER den Hinweis, dass eine individuelle Abstimmung mit dem Arzt nötig ist.
- Erstelle KEINE Pläne unter 1200 kcal/Tag ohne expliziten Hinweis auf ärztliche Begleitung.

### Eskalation
Bei diesen Themen erstellst du KEINEN Plan, sondern verweist freundlich an Fachpersonal:
- Essstörungen (Magersucht, Bulimie, Binge Eating)
- Extreme Diäten unter 800 kcal
- Schwangerschaft & Stillzeit (Verweis an Gynäkologen/Hebamme)
- Kinder unter 12 Jahren (Verweis an Kinderarzt)

### Tonalität
- Antworte auf Deutsch, warmherzig aber fachlich
- Duze die Nutzer
- Berücksichtige ALLE Profil-Einschränkungen strikt (Allergien = absolute No-Gos)
- Sprich den Nutzer NIEMALS mit Namen an – verwende nur "du"
- Nutze Markdown: ## für Tage, ### für Mahlzeiten, **fett** für wichtige Hinweise
- Füge ungefähre Kalorienangaben pro Mahlzeit hinzu
- Beende jeden Plan mit einer kompakten Einkaufsliste
- Beende JEDEN Plan mit: "💚 *Hinweis: Dieser Plan ersetzt keine ärztliche Beratung. Besprich Änderungen deiner Ernährung bei Vorerkrankungen mit deinem Arzt.*"

### Was du NICHT darfst
- Über Themen außerhalb von Ernährung sprechen
- Eigene Meinungen äußern
- Internet-Quellen oder Studien zitieren, die nicht in der Wissensbasis stehen

STRUKTUR:
## Zusammenfassung
[Was wurde berücksichtigt]

## [Tag]
### Frühstück (ca. X kcal)
[Konkrete Mahlzeit mit Portionsangaben]

### Mittagessen (ca. X kcal)
...

### Abendessen (ca. X kcal)
...

### Snacks
...

## Einkaufsliste
[Gruppiert nach Kategorie]`;

// ---------------------------------------------------------------------------
// 2. ESKALATIONS-CHECK für Zusatzwünsche
// ---------------------------------------------------------------------------
const ESCALATION_PATTERNS = [
  /\b(magersucht|bulimie|binge.?eating|essst[öo]rung|anorexie|purging)\b/i,
  /\b(suizid|selbstmord|umbringen|selbstverletz|ritzen|nicht.+leben)\b/i,
  /\b(anaphyla|notarzt|notaufnahme|bewusstlos|atemnot|schock)\b/i,
];

const ESCALATION_RESPONSE = `Ich verstehe, dass dich das beschäftigt, und ich nehme das sehr ernst.

**Bei diesem Thema kann ich leider keinen Ernährungsplan erstellen.** Bitte wende dich an:

- **Akute Notfälle:** Notarzt 112
- **Telefonseelsorge:** 0800 111 0 111 (kostenlos, 24/7)
- **Essstörungen:** Bundeszentrale für gesundheitliche Aufklärung – 0221 892031
- **Deine Hausärztin / dein Hausarzt** für eine individuelle Beratung

Du bist nicht allein – es gibt Menschen, die dir helfen können. 💚`;

// ---------------------------------------------------------------------------
// Helper: Statische Antwort als SSE streamen
// ---------------------------------------------------------------------------
function streamStaticResponse(text: string): Response {
  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "text", text })}\n\n`
        )
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
    const { zeitraum, zusatzwunsch } = await request.json();

    // ---- Pre-Check: Eskalation im Zusatzwunsch ----
    if (zusatzwunsch && ESCALATION_PATTERNS.some((p) => p.test(zusatzwunsch))) {
      return streamStaticResponse(ESCALATION_RESPONSE);
    }

    const supabase = createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Load profile + behavior context in parallel
    const [profileResult, behaviorContext] = await Promise.all([
      supabase
        .from("ea_profiles")
        .select("*")
        .eq("user_id", user.id)
        .limit(1),
      loadUserBehaviorContext(supabase, user.id),
    ]);

    const p = profileResult.data?.[0];
    const profilSnapshot: Record<string, unknown> = {};
    const profilParts: string[] = [];

    if (p) {
      // Name bewusst NICHT an Claude senden (DSGVO – keine PII an externe API)
      // Aber im Snapshot speichern (bleibt lokal in Supabase)
      if (p.name) {
        profilSnapshot.name = p.name;
      }
      if (p.alter_jahre) {
        profilParts.push(`Alter: ${p.alter_jahre} Jahre`);
        profilSnapshot.alter_jahre = p.alter_jahre;
      }
      if (p.geschlecht) {
        profilParts.push(`Geschlecht: ${p.geschlecht}`);
        profilSnapshot.geschlecht = p.geschlecht;
      }
      if (p.groesse_cm) {
        profilParts.push(`Größe: ${p.groesse_cm} cm`);
        profilSnapshot.groesse_cm = p.groesse_cm;
      }
      if (p.gewicht_kg) {
        profilParts.push(`Gewicht: ${p.gewicht_kg} kg`);
        profilSnapshot.gewicht_kg = p.gewicht_kg;
      }
      if (p.ziel) {
        profilParts.push(`Ziel: ${p.ziel}`);
        profilSnapshot.ziel = p.ziel;
      }
      if (p.allergien?.length) {
        profilParts.push(
          `Allergien/Unverträglichkeiten: ${p.allergien.join(", ")}`
        );
        profilSnapshot.allergien = p.allergien;
      }
      if (p.ernaehrungsform) {
        profilParts.push(`Ernährungsform: ${p.ernaehrungsform}`);
        profilSnapshot.ernaehrungsform = p.ernaehrungsform;
      }
      if (p.krankheiten) {
        profilParts.push(`Besonderheiten: ${p.krankheiten}`);
        profilSnapshot.krankheiten = p.krankheiten;
      }
      if (p.aktivitaet) {
        profilParts.push(`Aktivitätslevel: ${p.aktivitaet}`);
        profilSnapshot.aktivitaet = p.aktivitaet;
      }
    }

    // ---- RAG: Vektor-Suche mit Confidence-Scoring ----
    let knowledgeContext = "";
    let ragConfidence: "high" | "low" | "none" = "none";

    try {
      const ragQuery = `Ernährungsplan ${zeitraum || "7 Tage"} ${p?.ernaehrungsform || ""} ${p?.allergien?.join(" ") || ""} ${p?.ziel || ""} ${p?.krankheiten || ""}`.trim();

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

        if (avgSimilarity >= 0.45) {
          ragConfidence = "high";
        } else if (avgSimilarity >= 0.3) {
          ragConfidence = "low";
        }

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

    // ---- System Prompt bauen ----
    let systemPrompt = MEAL_PLAN_PROMPT;

    if (profilParts.length) {
      systemPrompt += `\n\nNUTZERPROFIL:\n${profilParts.join("\n")}`;
    }

    if (behaviorContext) {
      systemPrompt += `\n\n${behaviorContext}`;
      systemPrompt += `\n\nHINWEIS ZUM VERHALTENKONTEXT: Nutze das Ernährungstagebuch und den Gewichtsverlauf, um den Plan an das tatsächliche Essverhalten anzupassen. Wenn du Muster erkennst (z.B. wenig Protein, viele Snacks abends, fehlende Mahlzeiten, stagnierendes Gewicht), passe den Plan proaktiv an. Erkläre kurz in der Zusammenfassung, was du aus den echten Daten berücksichtigt hast.`;
    }

    if (knowledgeContext) {
      systemPrompt += `\n\nWISSENSBASIS:\n${knowledgeContext}`;
    }

    // Bei niedriger RAG-Konfidenz: extra Warnung
    if (ragConfidence === "low") {
      systemPrompt += `\n\n⚠️ ACHTUNG: Die Relevanz der gefundenen Dokumente ist NIEDRIG. Halte dich besonders strikt an allgemein anerkannte Ernährungsempfehlungen. Erfinde NICHTS.`;
    }

    // Bei keinen RAG-Treffern: trotzdem Plan erstellen (Ernährungspläne basieren auch auf allgemeinem Wissen)
    // aber mit deutlichem Hinweis
    if (ragConfidence === "none") {
      systemPrompt += `\n\n⚠️ HINWEIS: Zu diesem Thema wurden KEINE spezifischen Dokumente in der Wissensbasis gefunden. Erstelle den Plan basierend auf allgemein anerkannten Ernährungsempfehlungen. Weise den Nutzer darauf hin, dass eine persönliche Beratung bei einer Ernährungsberaterin für eine individuelle Anpassung empfehlenswert ist.`;
    }

    const userMessage = `Erstelle einen Ernährungsplan für ${zeitraum || "7 Tage"}.${zusatzwunsch ? ` Zusätzlicher Wunsch: ${zusatzwunsch}` : ""}`;

    // Stream response
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const encoder = new TextEncoder();
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

          // Save meal plan after streaming
          const titel = `${zeitraum || "7 Tage"}-Plan vom ${new Date().toLocaleDateString("de-DE")}`;
          const { data: saved } = await supabase
            .from("ea_meal_plans")
            .insert({
              user_id: user.id,
              titel,
              zeitraum: zeitraum || "7 Tage",
              inhalt: fullContent,
              profil_snapshot: profilSnapshot,
            })
            .select("id")
            .limit(1);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done", planId: saved?.[0]?.id })}\n\n`
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
