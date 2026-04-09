import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { loadUserBehaviorContext } from "@/lib/utils/user-context";
import { deductCredits, CREDIT_COSTS } from "@/lib/credits";
import { hasKiConsent, KI_CONSENT_MISSING_RESPONSE } from "@/lib/consent";
import { touchLastActive } from "@/lib/last-active";
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
  if (action === "plan_generation" || action === "review") {
    return "claude-sonnet-4-5-20250929"; // Better model for complex tasks
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

    // ---- KI-Consent check (Art. 9 Abs. 2 lit. a DSGVO) ----
    if (!(await hasKiConsent(supabase, userId))) {
      return new Response(JSON.stringify(KI_CONSENT_MISSING_RESPONSE), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ---- Activity ping (for inactive-account auto-deletion cron) ----
    void touchLastActive(supabase, userId);

    // ---- Classify action + determine credit cost ----
    const action = classifyAction(message);
    const creditCost = CREDIT_COSTS[action === "chat" ? "chat_usage" : action];
    const creditType = action === "chat" ? "chat_usage" : action;
    const creditDesc = action === "plan_generation"
      ? "Ernährungsplan generiert"
      : action === "review"
      ? "Wochenreview erstellt"
      : "Chat-Nachricht";

    // ---- REVIEW FLOW (tier check before credit deduction) ----
    if (action === "review") {
      // Check tier BEFORE deducting credits
      const { data: userData } = await supabase
        .from("ea_users")
        .select("subscription_plan")
        .eq("clerk_id", userId)
        .single();

      const userPlan = userData?.subscription_plan || "free";

      if (userPlan === "free") {
        // No credits deducted for blocked feature
        return streamStaticResponse(
          "Der Wochenreview ist ab dem Basis-Plan verfügbar. Upgrade um deine Fortschritte jede Woche zusammengefasst zu bekommen. 💚"
        );
      }

      // Now deduct credits for eligible users
      const hasCredits = await deductCredits(userId, creditCost, creditType, creditDesc);
      if (!hasCredits) {
        return new Response(
          JSON.stringify({
            error: "insufficient_credits",
            message: "Nicht genügend Credits. Bitte lade Credits nach oder upgrade deinen Plan.",
          }),
          { status: 402 }
        );
      }

      return handleReviewFlow(supabase, userId, userPlan);
    }

    // ---- Credit check BEFORE calling Anthropic ----
    const hasCredits = await deductCredits(userId, creditCost, creditType, creditDesc);

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

    // ---- RAG: Vektor-Suche mit Follow-up-Kontext ----
    // Folgefragen wie "womit fange ich an?" enthalten keine Keywords.
    // Strategie: erst aktuelle Nachricht, bei <3 Treffern mit letzten User-
    // Nachrichten kombiniert nochmal suchen. Beste Treffer gewinnen.
    let knowledgeContext = "";
    let ragConfidence: "high" | "low" | "none" = "none";

    type RagDoc = { title: string; content: string; similarity: number };
    type RagResult = { docs: RagDoc[]; avgSimilarity: number };

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const runRagSearch = async (queryText: string): Promise<RagResult> => {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: queryText,
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      const { data } = await supabase.rpc("ea_match_documents", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.35,
        match_count: 5,
      });
      const docs = (data ?? []) as RagDoc[];
      const avgSimilarity =
        docs.length > 0
          ? docs.reduce((sum, d) => sum + d.similarity, 0) / docs.length
          : 0;
      return { docs, avgSimilarity };
    };

    try {
      let best = await runRagSearch(message);

      // Nicht genug Treffer → Folgefrage-Modus: mit User-Kontext neu suchen
      if (best.docs.length < 3) {
        const previousUserMessages = (history as { role: string; content: string }[])
          .filter((h) => h.role === "user")
          .slice(-2)
          .map((h) => h.content);

        if (previousUserMessages.length > 0) {
          const combinedQuery = [...previousUserMessages, message].join(" \n ");
          const contextual = await runRagSearch(combinedQuery);

          // Beste Variante gewinnt: zuerst nach Anzahl Treffer, dann Ø-Relevanz
          const contextualBetter =
            contextual.docs.length > best.docs.length ||
            (contextual.docs.length === best.docs.length &&
              contextual.avgSimilarity > best.avgSimilarity);

          if (contextualBetter) best = contextual;
        }
      }

      if (best.docs.length > 0) {
        if (best.avgSimilarity >= 0.5) ragConfidence = "high";
        else if (best.avgSimilarity >= 0.35) ragConfidence = "low";

        knowledgeContext = best.docs
          .map(
            (d) =>
              `[${d.title}] (Relevanz: ${Math.round(d.similarity * 100)}%)\n${d.content}`
          )
          .join("\n\n---\n\n");
      }
    } catch (e) {
      console.error("RAG search error:", e);
    }

    // ---- Fallback: Keine Wissensbasis-Treffer ----
    // Nur hart ablehnen wenn es KEINE Vorgeschichte gibt. Bei Folgefragen
    // darf die KI sich auf die bereits im Chat-Verlauf zitierten Fakten
    // stützen — history enthält die vorherigen (grounded) Assistant-Antworten.
    const hasConversationHistory =
      Array.isArray(history) &&
      history.some((h: { role: string }) => h.role === "assistant");

    if (ragConfidence === "none" && !hasConversationHistory) {
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

    if (knowledgeContext) {
      fullSystemPrompt += `\n\nWISSENSBASIS:\n${knowledgeContext}`;
    }

    if (ragConfidence === "low") {
      fullSystemPrompt += `\n\n⚠️ ACHTUNG: Die Relevanz der gefundenen Dokumente ist NIEDRIG. Sei besonders vorsichtig. Wenn die Dokumente die Frage nicht direkt beantworten, sage ehrlich, dass du dazu keine ausreichenden Informationen hast. Erfinde NICHTS.`;
    }

    if (ragConfidence === "none" && hasConversationHistory) {
      fullSystemPrompt += `\n\nHINWEIS (Folgefrage): Für diese Frage wurden keine neuen Dokumente in der Wissensbasis gefunden. Die Nachricht ist eine Folgefrage auf das bisherige Gespräch. Antworte basierend auf den Fakten, die du in vorherigen Turns bereits aus der Wissensbasis zitiert hast. Erfinde KEINE neuen Fakten, Zahlen oder Empfehlungen. Wenn die Folgefrage inhaltlich über das bisher Besprochene hinausgeht, sage ehrlich, dass du dazu mehr Kontext brauchst oder an die Ernährungsberaterin verweisen möchtest.`;
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
// Helper: Generate embedding for RAG search
// ---------------------------------------------------------------------------
async function generateEmbedding(text: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return JSON.stringify(res.data[0].embedding);
}

// ---------------------------------------------------------------------------
// REVIEW FLOW – Dedicated weekly review logic
// ---------------------------------------------------------------------------
async function handleReviewFlow(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
  plan: string
): Promise<Response> {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // 1. Collect all data in parallel
  const [weightResult, foodResult, profileResult, zieleResult, planResult] =
    await Promise.all([
      supabase
        .from("ea_weight_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: true }),
      supabase
        .from("ea_food_log")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: true }),
      supabase
        .from("ea_profiles")
        .select("*")
        .eq("user_id", userId)
        .single(),
      supabase.from("ea_ziele").select("*").eq("user_id", userId),
      supabase
        .from("ea_meal_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  const weightLogs = weightResult.data;
  const foodLogs = foodResult.data;
  const profile = profileResult.data;
  const ziele = zieleResult.data;
  const activePlan = planResult.data?.[0] || null;

  // 2. Build dynamic RAG search terms
  const searchTerms: string[] = [];

  if (profile?.ziel) searchTerms.push(profile.ziel);
  if (profile?.ernaehrungsform) searchTerms.push(profile.ernaehrungsform);

  if (
    activePlan?.parameters?.fasting &&
    activePlan.parameters.fasting !== "none"
  ) {
    searchTerms.push(activePlan.parameters.fasting + " Intervallfasten");
  }

  if (foodLogs?.length) {
    const allFoods = foodLogs
      .map(
        (f: Record<string, unknown>) =>
          (f.beschreibung as string) || ""
      )
      .join(" ")
      .toLowerCase();
    if (/brot|nudel|pasta|reis|kartoffel/i.test(allFoods))
      searchTerms.push("Kohlenhydrate Sättigung Alternativen");
    if (!/fleisch|fisch|ei|quark|tofu|linsen|bohnen/i.test(allFoods))
      searchTerms.push("Proteinquellen");
    if (/schoko|süß|chips|kuchen|keks/i.test(allFoods))
      searchTerms.push("Heißhunger gesunde Snacks");
  }

  if (profile?.ziel?.toLowerCase().includes("abnehm"))
    searchTerms.push("Gewichtsreduktion Sättigung Kaloriendefizit");
  if (profile?.ziel?.toLowerCase().includes("muskel"))
    searchTerms.push("Muskelaufbau Protein Kalorien Training");
  if (profile?.ziel?.toLowerCase().includes("gesund"))
    searchTerms.push("Ausgewogene Ernährung Mikronährstoffe Gemüse");
  if (profile?.ziel?.toLowerCase().includes("energie"))
    searchTerms.push("Blutzucker Energie Mahlzeitenrhythmus");
  if (profile?.allergien?.length)
    searchTerms.push(profile.allergien.join(" "));

  const searchQuery = searchTerms.length
    ? searchTerms.join(" ")
    : "Ernährung gesunde Lebensweise Wochenrückblick";

  let relevantDocumentsText =
    "Keine relevanten Dokumente gefunden.";
  try {
    const embedding = await generateEmbedding(searchQuery);
    const { data: relevantDocs } = await supabase.rpc(
      "ea_match_documents",
      {
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: 8,
      }
    );
    if (relevantDocs?.length) {
      relevantDocumentsText = relevantDocs
        .map((d: { content: string }) => d.content)
        .join("\n\n---\n\n");
    }
  } catch (e) {
    console.error("Review RAG search error:", e);
  }

  // 3. Build review system prompt
  const hasFoodLog = foodLogs && foodLogs.length > 0;
  const hasActivePlan = activePlan && activePlan.plan_data;
  const hasWeightData = weightLogs && weightLogs.length > 0;

  let essgewohnheitenBlock: string;

  if (hasActivePlan && hasFoodLog) {
    essgewohnheitenBlock = `
MODUS: PLAN-VS-REALITÄT-ABGLEICH

Dir liegen sowohl der aktive Ernährungsplan als auch das Tagebuch vor. Vergleiche beide — aber als Erkenntnis, NICHT als Bewertung.

REGELN:
- Erkenne wo Plan und Realität übereinstimmen und wo sie abweichen.
- Formuliere Abweichungen IMMER als Anpassungsvorschlag, nie als Kritik. Beispiel: "Dein Plan hatte 5x Frühstück vorgesehen, du hast 3x eingetragen — vielleicht passt ein späterer Start besser zu deinem Rhythmus."
- Wenn der Plan ein Fastenmodell hatte (z.B. 16:8): Prüfe ob die Tagebuch-Zeiten zum Fastenfenster passen. Wenn nicht, schlage ein anderes in der Wissensbasis belegtes Modell vor. ERLAUBTE Fastenmodelle: 16:8, 20:4, 5:2, 1:1 (Alternate Day), Periodisches Fasten. Schlage NIE ein Modell vor das nicht in dieser Liste steht.
- Wenn der Plan Mealprep vorsah: Prüfe ob die vorbereiteten Gerichte im Tagebuch auftauchen. Wenn nicht, frage ob das Vorkochen zu aufwändig war und schlage einfachere Mealprep-Optionen vor.
- Verknüpfe JEDEN Tipp mit dem persönlichen Ziel.
- Alle Tipps müssen aus der Wissensbasis ableitbar sein.`;
  } else if (hasFoodLog) {
    essgewohnheitenBlock = `
MODUS: NUR TAGEBUCH-ANALYSE

Es liegt kein aktiver Ernährungsplan vor, aber ein Tagebuch. Analysiere die echten Essgewohnheiten.

REGELN:
- Erkenne Muster aus dem Tagebuch (Mahlzeitenrhythmus, häufige Lebensmittel, Lücken).
- Verknüpfe JEDEN Tipp mit dem persönlichen Ziel.
- Weise am Ende freundlich darauf hin, dass ein Ernährungsplan die Empfehlungen noch persönlicher machen würde — als Einladung, nicht als Pflicht.
- Alle Tipps müssen aus der Wissensbasis ableitbar sein.`;
  } else if (hasActivePlan) {
    essgewohnheitenBlock = `
MODUS: NUR PLAN VORHANDEN

Es liegt ein Ernährungsplan vor, aber kein Tagebuch. Ohne Tagebuch kannst du nicht analysieren was wirklich gegessen wurde.

REGELN:
- Erkläre freundlich, dass der Review mit Tagebuch viel wertvoller wäre, weil du dann echte Muster erkennen kannst statt nur den Plan zu kommentieren.
- Gib 1-2 allgemeine Tipps basierend auf dem Profil und der Wissensbasis, die zum Ziel passen.
- Motiviere das Tagebuch zu nutzen — maximal 2-3 Sätze, kein Guilt-Tripping.`;
  } else {
    essgewohnheitenBlock = `
MODUS: WEDER PLAN NOCH TAGEBUCH

Weder Ernährungsplan noch Tagebuch sind vorhanden.

REGELN:
- Erkläre freundlich dass der Review mit Daten jede Woche persönlicher und wertvoller wird.
- Gib 1-2 allgemeine Tipps basierend auf dem Profil und der Wissensbasis.
- Lade ein, das Tagebuch und den Ernährungsplan auszuprobieren — als Einladung, nicht als Pflicht.`;
  }

  // Tier-dependent: Block 3 only for pro_plus
  const isPremium = plan === "pro_plus";

  const planEmpfehlung =
    hasActivePlan || hasFoodLog
      ? `
PLAN-EMPFEHLUNG:
- Beende Block 3 mit einem konkreten Vorschlag für einen angepassten Ernährungsplan basierend auf den Review-Erkenntnissen.
- Formuliere es so: "Basierend auf deiner Woche würde ich folgende Anpassungen für deinen nächsten Plan vorschlagen:" und dann konkrete Parameter-Empfehlungen.
- ERLAUBTE Parameter-Empfehlungen (nur diese, keine anderen):
  - Fastenmodell ändern: NUR auf 16:8, 20:4, 5:2, 1:1, Periodisches Fasten, oder Kein Fasten. KEINE anderen Fastenmodelle erfinden.
  - Mahlzeitenanzahl anpassen (1, 2, 3, 4, 5)
  - Mealprep an/aus oder Tage anpassen
  - Timing anpassen
- Beende mit: "Soll ich dir einen angepassten Plan für nächste Woche erstellen?"`
      : `
- Weise am Ende darauf hin, dass man jederzeit im Chat Fragen stellen oder einen Ernährungsplan erstellen lassen kann.
- Erwähne dass der Plan sich an den Alltag anpasst — Fastenmodell, Mahlzeitenanzahl, Mealprep, alles wählbar.`;

  // Block 3 section (only for premium)
  const block3Section = isPremium
    ? `
---

### 🎯 Deine Woche voraus

REGELN:
- Gib 2-3 konkrete, sofort umsetzbare Handlungsvorschläge für die nächste Woche.
- JEDER Vorschlag muss enthalten:
  1. Was genau tun (konkrete Handlung, nicht abstrakt)
  2. Warum das zum Ziel passt (1 Satz, basierend auf der Wissensbasis)
  3. Konkrete Lebensmittel oder Rezeptideen (nur aus der Wissensbasis)
- Die Vorschläge müssen sich am Alltag orientieren. Wenn aus dem Tagebuch erkennbar ist, dass jemand wenig Zeit hat, schlage einfache Optionen vor.
- Passe die Vorschläge an die Ernährungsform und Allergien an.
- Formuliere als Einladung: "Du könntest nächste Woche versuchen..." nicht "Du musst..."
${planEmpfehlung}

---

## Schlusssatz
- Beende den Review mit einem motivierenden, ehrlichen Satz. Nicht übertrieben enthusiastisch, sondern authentisch.
- Weise darauf hin, dass der Nutzer jederzeit im Chat konkrete Fragen stellen kann.`
    : `
---

## Schlusssatz
- Beende den Review mit einem motivierenden, kurzen Satz nach Block 2. Nicht übertrieben enthusiastisch, sondern authentisch.`;

  const structureInstruction = isPremium
    ? "Strukturiere deine Antwort IMMER in genau diese drei Abschnitte:"
    : "Strukturiere deine Antwort in genau ZWEI Abschnitte: Gewichtsverlauf und Essgewohnheiten. Erstelle KEINEN dritten Abschnitt.";

  const reviewSystemPrompt = `Du bist eine KI-Ernährungsberaterin. Du erstellst gerade den persönlichen Wochenrückblick.

## Deine Persönlichkeit
- Sprich den User mit Du an
- Freundlich, warm, fachlich fundiert
- Kein Arzt-Ton, kein Fitness-Influencer-Ton
- Du bist wie eine kluge Freundin die Ernährungswissenschaft studiert hat
- Motivierend ohne zu belehren

## Wissensbasis

Die folgenden Dokumente sind deine EINZIGE fachliche Grundlage. Alle Ernährungstipps, Lebensmittelempfehlungen und Handlungsvorschläge müssen sich aus diesen Dokumenten ableiten lassen.

${relevantDocumentsText}

## Nutzerdaten

### Profil
${JSON.stringify(profile, null, 2)}

### Aktive Ziele
${JSON.stringify(ziele, null, 2)}

### Gewichtsverlauf (letzte 7 Tage)
${hasWeightData ? JSON.stringify(weightLogs, null, 2) : "Keine Gewichtsdaten eingetragen."}

### Ernährungstagebuch (letzte 7 Tage)
${hasFoodLog ? JSON.stringify(foodLogs, null, 2) : "Kein Tagebuch geführt."}

### Aktiver Ernährungsplan
${hasActivePlan ? JSON.stringify({ parameters: activePlan.parameters, plan_data: activePlan.plan_data }, null, 2) : "Kein aktiver Ernährungsplan vorhanden."}

## Struktur deines Wochenrückblicks

${structureInstruction}

---

### 📊 Dein Gewichtsverlauf

REGELN — STRIKT EINHALTEN:
- Beschreibe das Gewicht AUSSCHLIESSLICH als Bereich: "Dein Gewicht lag diese Woche zwischen X und Y kg."
- Nenne NIEMALS eine einzelne Veränderung als "Zunahme" oder "Abnahme".
- Sprich nur von einem Trend, wenn der Nutzer seit 3+ Wochen Daten einträgt UND eine konsistente Richtung erkennbar ist. Bei einer einzelnen Woche gibt es keinen Trend — nur eine Momentaufnahme.
- Gewichtsschwankungen von bis zu 1-2 kg sind völlig normal. Erwähne das IMMER wenn Schwankungen in diesem Bereich liegen, mit möglichen Ursachen: Wasserhaushalt, hormoneller Zyklus, Salzkonsum, Stress, Schlafqualität.
- Vermeide JEDE Formulierung die Schuld oder Wertung impliziert: kein "trotzdem zugenommen", kein "leider gestiegen", kein "nicht geschafft", kein "super abgenommen", kein "toll gemacht".
- Berichte das Gewicht wie einen Wetterbericht: sachlich, neutral, informativ.
- Falls keine Gewichtsdaten vorhanden: Ermutige freundlich, das Tracking zu nutzen. Erkläre kurz den Nutzen (Muster erkennen über Zeit, nicht kontrollieren). Maximal 2-3 Sätze.

---

### 🍽️ Deine Essgewohnheiten
${essgewohnheitenBlock}

Unabhängig vom Modus gelten immer:
- Wenn Ziel = Abnehmen: Fokus auf Sättigung, Proteinverteilung, Mahlzeitenrhythmus.
- Wenn Ziel = Muskelaufbau: Fokus auf Proteinmenge, Timing, Kalorienversorgung.
- Wenn Ziel = Gesünder essen: Fokus auf Vielfalt, Mikronährstoffe, Gemüseanteil.
- Wenn Ziel = Mehr Energie: Fokus auf Blutzuckerstabilität, Mahlzeitenregelmäßigkeit, Hydration.
- Berücksichtige Allergien und Ernährungsform bei allen Empfehlungen.
${block3Section}

## QUELLENREGELN — STRIKT EINHALTEN
- Du antwortest AUSSCHLIESSLICH auf Basis der bereitgestellten Wissensbasis-Dokumente und der Nutzerdaten.
- Wenn die Wissensbasis keine Information zu einem Thema enthält, sage ehrlich "Dazu habe ich in meiner Wissensbasis keine spezifische Information" — erfinde NICHTS.
- Nutze KEIN allgemeines Wissen aus deinem Training.
- Nenne keine Studien, Statistiken oder Zahlen die nicht in der Wissensbasis stehen.
- Schlage NIEMALS ein Fastenmodell vor das nicht in der erlaubten Liste steht (16:8, 20:4, 5:2, 1:1, Periodisches Fasten).

## VERBOTEN
- Keine Kalorienzählung (es sei denn explizit als Ziel gesetzt)
- Keine BMI-Berechnungen
- Keine medizinischen Diagnosen oder Empfehlungen
- Kein Vergleich mit Normwerten oder anderen Personen
- Keine moralische Bewertung von Essverhalten ("Sünde", "Cheat Day", "geschummelt")
- Keine geschlechterspezifischen Stereotypen
- Keine Informationen aus externen Quellen
- Keine Fastenmodelle die nicht in der Wissensbasis belegt sind`;

  // 4. Stream via Anthropic (tier-dependent token limit)
  const maxTokens = isPremium ? 2000 : 1200;

  const proTeaserText = `\n\n---\n\n### 🎯 Deine Woche voraus\n\nMöchtest du konkrete Handlungsvorschläge für nächste Woche — mit Lebensmittelempfehlungen, Rezeptideen und einem angepassten Ernährungsplan? Upgrade auf Premium für den vollen Wochenrückblick.\n\n[Premium entdecken →]`;

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const stream = anthropic.messages.stream({
    model: getModelForAction("review"),
    max_tokens: maxTokens,
    system: reviewSystemPrompt,
    messages: [
      { role: "user", content: "Erstelle meinen Wochenrückblick." },
    ],
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

        // For pro users: append static teaser text for Block 3
        if (!isPremium) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text", text: proTeaserText })}\n\n`
            )
          );
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done" })}\n\n`
          )
        );
        controller.close();
      } catch (err) {
        console.error("Review stream error:", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: "Review fehlgeschlagen" })}\n\n`
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
