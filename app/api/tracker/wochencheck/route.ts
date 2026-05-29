import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { loadUserBehaviorContext } from "@/lib/utils/user-context";
import { deductCredits, refundCredits, CREDIT_COSTS } from "@/lib/credits";
import { getUserPlan } from "@/lib/feature-gates-server";
import { hasFeatureAccess, getUpgradeMessage } from "@/lib/feature-gates";
import { hasKiConsent, KI_CONSENT_MISSING_RESPONSE } from "@/lib/consent";
import { checkRateLimit, wochencheckLimiter } from "@/lib/rate-limit";
import { quoteField, sanitizeForPrompt } from "@/lib/utils/prompt-safe";
import { getAnthropic } from "@/lib/anthropic-client";
import {
  createUsageRequestId,
  extractAnthropicUsage,
  logUsage,
  normalizeUsagePlan,
  type UsagePlan,
  type UsageTokenFields,
} from "@/lib/usage-logging";

const WOCHENCHECK_PROMPT = `Du bist eine warmherzige, fachlich fundierte Ernährungsberaterin. Du erstellst einen personalisierten Wochencheck basierend auf den echten Daten des Nutzers.

## DEINE AUFGABE
Analysiere das Ernährungstagebuch, den Gewichtsverlauf und die aktiven Ziele des Nutzers und erstelle einen motivierenden, konkreten Wochenrückblick.

## STRUKTUR (halte dich exakt daran):

### Was gut lief
- 2-3 konkrete positive Beobachtungen aus den echten Daten
- Lobe spezifische Mahlzeiten oder Verhaltensänderungen

### Was du verbessern kannst
- 2-3 konkrete, umsetzbare Verbesserungsvorschläge
- Basiere sie auf echten Mustern (z.B. fehlende Mahlzeiten, wenig Gemüse, zu viele Snacks abends)
- Formuliere als Vorschlag, nicht als Kritik

### Dein Fokus für nächste Woche
- 1 konkreter, einfacher Fokus-Punkt den der Nutzer umsetzen kann
- Mach es messbar und motivierend

## REGELN:
- Beziehe dich NUR auf echte Daten aus dem Profil, Tagebuch und Gewichtsverlauf
- Wenn wenige Daten vorhanden sind, sage das ehrlich und motiviere zum Tracking
- Duze den Nutzer, sei warmherzig aber fachlich
- Nutze Markdown für Formatierung
- Halte dich kurz und prägnant (max 300 Wörter)
- Wenn der Nutzer ein Gewichtsziel hat, beziehe den Trend ein
- Erfinde KEINE Daten oder Mahlzeiten die nicht im Kontext stehen
- Beende mit: "💚 *Hinweis: Diese Analyse ersetzt keine ärztliche Beratung.*"`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: Request) {
  let chargedUserId: string | null = null;
  let creditsDeducted = false;
  const creditCost = CREDIT_COSTS.review;
  let usagePlan: UsagePlan = "free";
  const usageRequestId = createUsageRequestId();

  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
    chargedUserId = userId;

    const rateLimit = await checkRateLimit(wochencheckLimiter, userId);
    if (!rateLimit.success) {
      return new Response(
        JSON.stringify({
          error: "rate_limited",
          message: "Tägliches Limit für Wochenchecks erreicht. Bitte versuche es morgen erneut.",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const plan = await getUserPlan(userId);
    usagePlan = normalizeUsagePlan(plan);
    if (!hasFeatureAccess(plan, "review")) {
      return new Response(
        JSON.stringify({
          error: "feature_locked",
          feature: "review",
          message: getUpgradeMessage("review"),
          requiredPlan: "pro",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createSupabaseAdmin();

    // DSGVO Art. 6/7 — Wochencheck nutzt Sonnet; ohne Einwilligung keine Verarbeitung.
    if (!(await hasKiConsent(supabase, userId))) {
      return new Response(JSON.stringify(KI_CONSENT_MISSING_RESPONSE), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

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
      // Name bewusst NICHT an Claude senden (DSGVO – keine PII an externe API)
      if (p.alter_jahre) profilParts.push(`Alter: ${p.alter_jahre} Jahre`);
      if (p.geschlecht) profilParts.push(`Geschlecht: ${p.geschlecht}`);
      if (p.groesse_cm) profilParts.push(`Größe: ${p.groesse_cm} cm`);
      if (p.gewicht_kg) profilParts.push(`Gewicht: ${p.gewicht_kg} kg`);
      if (p.ziel) profilParts.push(`Ziel: ${quoteField(p.ziel, 200)}`);
      if (p.allergien?.length)
        profilParts.push(`Allergien/Unverträglichkeiten: ${p.allergien.join(", ")}`);
      if (p.ernaehrungsform) profilParts.push(`Ernährungsform: ${sanitizeForPrompt(p.ernaehrungsform, { maxLen: 100 })}`);
      if (p.krankheiten) profilParts.push(`Besonderheiten: ${quoteField(p.krankheiten, 500)}`);
      if (p.aktivitaet) profilParts.push(`Aktivitätslevel: ${p.aktivitaet}`);
    }

    // Check if there's enough data for a meaningful review
    if (!behaviorContext) {
      return streamStaticResponse(
        `## Noch nicht genug Daten für deinen Wochencheck\n\nUm dir einen personalisierten Wochenrückblick zu erstellen, brauche ich ein paar Einträge in deinem **Ernährungstagebuch** oder **Gewichtstracker**.\n\nTrage diese Woche ein paar Mahlzeiten ein und komm dann wieder – ich freue mich darauf, dir zu helfen! 💚`
      );
    }

    const hasCredits = await deductCredits(
      userId,
      creditCost,
      "review",
      "Wochencheck erstellt"
    );
    if (!hasCredits) {
      return new Response(
        JSON.stringify({
          error: "insufficient_credits",
          message: `Nicht genügend Credits. Ein Wochencheck kostet ${creditCost} Credits.`,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }
    creditsDeducted = true;

    // Build system prompt
    let systemPrompt = WOCHENCHECK_PROMPT;
    if (profilParts.length) {
      systemPrompt += `\n\nNUTZERPROFIL:\n${profilParts.join("\n")}`;
    }
    systemPrompt += `\n\n${behaviorContext}`;

    // Stream response
    const anthropic = getAnthropic();
    const model = "claude-sonnet-4-6";
    const llmStartedAt = Date.now();
    const stream = anthropic.messages.stream({
      model,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: "Erstelle meinen persönlichen Wochencheck basierend auf meinen Daten.",
        },
      ],
    });

    const encoder = new TextEncoder();
    let finalUsage: UsageTokenFields = {};

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const messageStream = await stream;
          for await (const event of messageStream) {
            if (event.type === "message_start") {
              finalUsage = {
                ...finalUsage,
                ...extractAnthropicUsage(event.message?.usage),
              };
            }
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
            if (event.type === "message_delta") {
              finalUsage = {
                ...finalUsage,
                ...extractAnthropicUsage(event.usage),
              };
            }
          }
          void logUsage({
            userId,
            plan: usagePlan,
            endpoint: "wochencheck",
            action: "wochencheck",
            model,
            ...finalUsage,
            creditsCharged: creditCost,
            requestId: usageRequestId,
            durationMs: Date.now() - llmStartedAt,
          });
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        } catch (err) {
          console.error("Wochencheck stream error:", err);
          void refundCredits(userId, creditCost, "Wochencheck API-Fehler");
          void logUsage({
            userId,
            plan: usagePlan,
            endpoint: "wochencheck",
            action: "wochencheck",
            model,
            ...finalUsage,
            creditsCharged: creditCost,
            creditsRefunded: true,
            requestId: usageRequestId,
            error: err instanceof Error ? err.message : "Wochencheck stream error",
            durationMs: Date.now() - llmStartedAt,
          });
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: "Analyse fehlgeschlagen" })}\n\n`
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
    console.error("Wochencheck error:", error);
    if (creditsDeducted && chargedUserId) {
      await refundCredits(chargedUserId, creditCost, "Wochencheck Server-Fehler").catch((err) =>
        console.error("Wochencheck refund error:", err)
      );
      void logUsage({
        userId: chargedUserId,
        plan: usagePlan,
        endpoint: "wochencheck",
        action: "wochencheck",
        model: "claude-sonnet-4-6",
        creditsCharged: creditCost,
        creditsRefunded: true,
        requestId: usageRequestId,
        error: error instanceof Error ? error.message : "Wochencheck Server-Fehler",
      });
    }
    return new Response(JSON.stringify({ error: "Server-Fehler" }), {
      status: 500,
    });
  }
}

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
