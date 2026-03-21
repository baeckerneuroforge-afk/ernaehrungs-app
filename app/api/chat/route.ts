import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { loadUserBehaviorContext } from "@/lib/utils/user-context";
import { deductCredits, CREDIT_COSTS } from "@/lib/credits";
import { classifyAction } from "@/lib/classify-action";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// 1. SYSTEM PROMPT – strikt RAG-basiert, keine Halluzination
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Du bist eine freundliche, fachlich fundierte Ernährungsberaterin. Du arbeitest AUSSCHLIEßLICH auf Basis der bereitgestellten Wissensbasis.

## ABSOLUTE REGELN (NIEMALS brechen):

### Wissensbasis-Pflicht
- Du darfst NUR Informationen verwenden, die in der WISSENSBASIS stehen.
- Wenn die Wissensbasis zu einer Frage KEINE Informationen enthält, sage IMMER:
  "Dazu habe ich leider keine gesicherten Informationen in meiner Wissensbasis. Bitte wende dich an deine Ernährungsberaterin für eine persönliche Beratung."
- Erfinde NIEMALS Fakten, Nährwerte, Rezepte oder Empfehlungen, die nicht in der Wissensbasis stehen.
- Wenn du dir nicht 100% sicher bist, ob eine Information aus der Wissensbasis stammt, gib sie NICHT als Fakt wieder.

### Medizinische Grenze – HART
- Gib KEINE medizinischen Diagnosen, Medikamenten-Empfehlungen oder Therapievorschläge.
- Gib KEINE Empfehlungen zu Nahrungsergänzungsmitteln, Dosierungen oder Supplementen.
- Bei Fragen zu Krankheiten (Diabetes, Schilddrüse, Nierenerkrankungen, Essstörungen, etc.):
  Beziehe dich NUR auf das, was in der Wissensbasis steht. Ergänze IMMER den Hinweis, dass eine individuelle Beratung durch Arzt oder Ernährungsberaterin nötig ist.
- Bei Symptom-Beschreibungen (Schmerzen, Übelkeit, Schwindel, etc.):
  Antworte NICHT inhaltlich, sondern empfehle sofort einen Arztbesuch.

### Eskalation – Sofortiger Verweis
Bei diesen Themen antwortest du AUSSCHLIESSLICH mit einem freundlichen Verweis an Fachpersonal:
- Essstörungen (Magersucht, Bulimie, Binge Eating)
- Suizidgedanken, Selbstverletzung
- Schwangerschaft & Stillzeit (nur Verweis an Gynäkologen/Hebamme)
- Kinder unter 12 Jahren (Verweis an Kinderarzt)
- Akute allergische Reaktionen (Notarzt empfehlen)
- Fasten bei Vorerkrankungen
- Extreme Diäten unter 800 kcal

### Tonalität
- Antworte auf Deutsch, warmherzig, empathisch
- Duze die Nutzer
- Beziehe das Nutzerprofil ein (Allergien, Ziele, Einschränkungen) wenn vorhanden
- Sprich den Nutzer NIEMALS mit Namen an – verwende nur "du"
- Formatiere mit Markdown wo sinnvoll (Listen, fett, Tabellen für Nährwerte)
- Halte Antworten verständlich – nicht zu wissenschaftlich, nicht zu oberflächlich
- Beende JEDE Antwort mit: "💚 *Hinweis: Diese Informationen ersetzen keine ärztliche Beratung.*"

### Was du NICHT darfst
- Über Themen außerhalb von Ernährung sprechen (Politik, Sport-Training, Technik, etc.)
- Eigene Meinungen äußern
- Internet-Quellen oder Studien zitieren, die nicht in der Wissensbasis stehen
- "Ich denke", "Ich glaube", "Möglicherweise" verwenden – entweder die Wissensbasis sagt es, oder du sagst dass du keine Information hast`;

// ---------------------------------------------------------------------------
// 2. ESKALATIONS-KEYWORDS – Pre-Check vor dem LLM
// ---------------------------------------------------------------------------
const ESCALATION_PATTERNS = [
  /\b(magersucht|bulimie|binge.?eating|essst[öo]rung|anorexie|purging)\b/i,
  /\b(suizid|selbstmord|umbringen|selbstverletz|ritzen|nicht.+leben)\b/i,
  /\b(anaphyla|notarzt|notaufnahme|bewusstlos|atemnot|schock)\b/i,
];

const ESCALATION_RESPONSE = `Ich verstehe, dass dich das beschäftigt, und ich nehme das sehr ernst.

**Bei diesem Thema bin ich nicht die richtige Ansprechpartnerin.** Bitte wende dich an:

- **Akute Notfälle:** Notarzt 112
- **Telefonseelsorge:** 0800 111 0 111 (kostenlos, 24/7)
- **Essstörungen:** Bundeszentrale für gesundheitliche Aufklärung – 0221 892031
- **Deine Hausärztin / dein Hausarzt** für eine individuelle Beratung

Du bist nicht allein – es gibt Menschen, die dir helfen können. 💚`;

// ---------------------------------------------------------------------------
// 3. OFF-TOPIC-KEYWORDS
// ---------------------------------------------------------------------------
const OFF_TOPIC_PATTERNS = [
  /\b(programmier|coding|software|javascript|python|html)\b/i,
  /\b(politik|wahlen|partei|regierung|krieg)\b/i,
  /\b(fussball|bundesliga|champions.?league|olympi)\b/i,
  /\b(aktien|bitcoin|krypto|b[öo]rse|investier)\b/i,
  /\b(wetter|temperatur|regen|schnee).{0,20}(heute|morgen|woche)/i,
];

const OFF_TOPIC_RESPONSE = `Das ist leider nicht mein Fachgebiet 😊 Ich kann dir nur bei Fragen rund um **Ernährung, Nährstoffe, Rezepte und gesunde Lebensweise** helfen.

Hast du eine Ernährungsfrage? Dann stell sie gerne!

💚 *Hinweis: Diese Informationen ersetzen keine ärztliche Beratung.*`;

// ---------------------------------------------------------------------------
// 4. NO-KNOWLEDGE FALLBACK
// ---------------------------------------------------------------------------
const NO_KNOWLEDGE_RESPONSE = `Zu dieser Frage habe ich leider **keine gesicherten Informationen** in meiner Wissensbasis.

Ich möchte dir keine ungenauen oder falschen Informationen geben. Bitte wende dich für diese Frage an:
- **Deine Ernährungsberaterin** für eine persönliche Beratung
- **Deinen Hausarzt** bei gesundheitlichen Fragen

Gerne helfe ich dir bei anderen Ernährungsthemen, zu denen ich fundierte Informationen habe!

💚 *Hinweis: Diese Informationen ersetzen keine ärztliche Beratung.*`;

// ---------------------------------------------------------------------------
// 5. Model routing based on action type
// ---------------------------------------------------------------------------
function getModelForAction(action: string): string {
  if (action === "plan_generation") {
    return "claude-sonnet-4-5-20250929"; // Better model for complex plan generation
  }
  return "claude-haiku-4-5-20251001"; // Fast + cheap for regular chat
}

// ---------------------------------------------------------------------------
// 6. ROUTE HANDLER
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400,
      });
    }

    // ---- Pre-Check: Eskalation (no credits consumed) ----
    if (ESCALATION_PATTERNS.some((p) => p.test(message))) {
      return streamStaticResponse(ESCALATION_RESPONSE);
    }

    // ---- Pre-Check: Off-Topic (no credits consumed) ----
    if (OFF_TOPIC_PATTERNS.some((p) => p.test(message))) {
      return streamStaticResponse(OFF_TOPIC_RESPONSE);
    }

    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    // ---- Classify action + determine credit cost ----
    const action = classifyAction(message);
    const creditCost = action === "plan_generation"
      ? CREDIT_COSTS.plan_generation
      : CREDIT_COSTS.chat_usage;

    // ---- Credit check BEFORE calling Anthropic ----
    const hasCredits = await deductCredits(
      userId,
      creditCost,
      action === "plan_generation" ? "plan_generation" : "chat_usage",
      action === "plan_generation" ? "Ernährungsplan generiert" : "Chat-Nachricht"
    );

    if (!hasCredits) {
      return new Response(
        JSON.stringify({
          error: "insufficient_credits",
          message: "Nicht genügend Credits. Bitte lade Credits nach oder upgrade deinen Plan.",
        }),
        { status: 402 }
      );
    }

    // ---- Load profile + behavior context ----
    let profileContext = "";
    let behaviorContext = "";

    const [profileResult, behavior] = await Promise.all([
      supabase
        .from("ea_profiles")
        .select("*")
        .eq("user_id", userId)
        .limit(1),
      loadUserBehaviorContext(supabase, userId),
    ]);

    const profile = profileResult.data;
    behaviorContext = behavior;

    if (profile?.[0]) {
      const p = profile[0];
      const parts = [];
      if (p.alter_jahre) parts.push(`Alter: ${p.alter_jahre} Jahre`);
      if (p.geschlecht) parts.push(`Geschlecht: ${p.geschlecht}`);
      if (p.groesse_cm) parts.push(`Größe: ${p.groesse_cm} cm`);
      if (p.gewicht_kg) parts.push(`Gewicht: ${p.gewicht_kg} kg`);
      if (p.ziel) parts.push(`Ziel: ${p.ziel}`);
      if (p.allergien?.length)
        parts.push(
          `Allergien/Unverträglichkeiten: ${p.allergien.join(", ")}`
        );
      if (p.ernaehrungsform)
        parts.push(`Ernährungsform: ${p.ernaehrungsform}`);
      if (p.krankheiten) parts.push(`Besonderheiten: ${p.krankheiten}`);
      if (p.aktivitaet) parts.push(`Aktivitätslevel: ${p.aktivitaet}`);
      profileContext = parts.join("\n");
    }

    // ---- RAG: Vektor-Suche ----
    let knowledgeContext = "";
    let ragConfidence: "high" | "low" | "none" = "none";

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: message,
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      const { data: docs } = await supabase.rpc("ea_match_documents", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.35,
        match_count: 5,
      });

      if (docs?.length) {
        const avgSimilarity =
          docs.reduce(
            (sum: number, d: { similarity: number }) => sum + d.similarity,
            0
          ) / docs.length;

        if (avgSimilarity >= 0.5) {
          ragConfidence = "high";
        } else if (avgSimilarity >= 0.35) {
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

    // ---- Fallback: Keine Wissensbasis-Treffer ----
    if (ragConfidence === "none") {
      return streamStaticResponse(NO_KNOWLEDGE_RESPONSE);
    }

    // ---- System Prompt bauen ----
    let fullSystemPrompt = SYSTEM_PROMPT;

    if (profileContext) {
      fullSystemPrompt += `\n\nNUTZERPROFIL:\n${profileContext}`;
    }

    if (behaviorContext) {
      fullSystemPrompt += `\n\n${behaviorContext}`;
      fullSystemPrompt += `\n\nHINWEIS ZUM VERHALTENKONTEXT: Nutze das Ernährungstagebuch, den Gewichtsverlauf und die aktiven Ziele, um deine Antworten persönlicher und relevanter zu machen. Erkenne Muster (z.B. wenig Protein, zu viele Snacks, fehlende Mahlzeiten) und gib proaktiv Hinweise, wenn sie zum Ziel des Nutzers passen. Sprich den Nutzer auf seine echten Daten an statt nur allgemein zu antworten.`;
    }

    fullSystemPrompt += `\n\nWISSENSBASIS:\n${knowledgeContext}`;

    if (ragConfidence === "low") {
      fullSystemPrompt += `\n\n⚠️ ACHTUNG: Die Relevanz der gefundenen Dokumente ist NIEDRIG. Sei besonders vorsichtig. Wenn die Dokumente die Frage nicht direkt beantworten, sage ehrlich, dass du dazu keine ausreichenden Informationen hast. Erfinde NICHTS.`;
    }

    // ---- Messages bauen ----
    const messages = [
      ...history.slice(-8).map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    // ---- Dynamic model routing ----
    const model = getModelForAction(action);

    // ---- Stream Response ----
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const stream = anthropic.messages.stream({
      model,
      max_tokens: action === "plan_generation" ? 3000 : 1500,
      system: fullSystemPrompt,
      messages,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const messageStream = await stream;
          for await (const event of messageStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`
                )
              );
            }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: "Stream fehlgeschlagen" })}\n\n`
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
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Server-Fehler" }), {
      status: 500,
    });
  }
}

// ---------------------------------------------------------------------------
// Helper: Statische Antwort als SSE streamen (für Pre-Check Responses)
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
