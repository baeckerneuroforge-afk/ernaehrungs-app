import { createSupabaseServer } from "@/lib/supabase/server";
import { loadUserBehaviorContext } from "@/lib/utils/user-context";
import Anthropic from "@anthropic-ai/sdk";

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
  try {
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
    const profilParts: string[] = [];

    if (p) {
      // Name bewusst NICHT an Claude senden (DSGVO – keine PII an externe API)
      if (p.alter_jahre) profilParts.push(`Alter: ${p.alter_jahre} Jahre`);
      if (p.geschlecht) profilParts.push(`Geschlecht: ${p.geschlecht}`);
      if (p.groesse_cm) profilParts.push(`Größe: ${p.groesse_cm} cm`);
      if (p.gewicht_kg) profilParts.push(`Gewicht: ${p.gewicht_kg} kg`);
      if (p.ziel) profilParts.push(`Ziel: ${p.ziel}`);
      if (p.allergien?.length)
        profilParts.push(`Allergien/Unverträglichkeiten: ${p.allergien.join(", ")}`);
      if (p.ernaehrungsform) profilParts.push(`Ernährungsform: ${p.ernaehrungsform}`);
      if (p.krankheiten) profilParts.push(`Besonderheiten: ${p.krankheiten}`);
      if (p.aktivitaet) profilParts.push(`Aktivitätslevel: ${p.aktivitaet}`);
    }

    // Check if there's enough data for a meaningful review
    if (!behaviorContext) {
      return streamStaticResponse(
        `## Noch nicht genug Daten für deinen Wochencheck\n\nUm dir einen personalisierten Wochenrückblick zu erstellen, brauche ich ein paar Einträge in deinem **Ernährungstagebuch** oder **Gewichtstracker**.\n\nTrage diese Woche ein paar Mahlzeiten ein und komm dann wieder – ich freue mich darauf, dir zu helfen! 💚`
      );
    }

    // Build system prompt
    let systemPrompt = WOCHENCHECK_PROMPT;
    if (profilParts.length) {
      systemPrompt += `\n\nNUTZERPROFIL:\n${profilParts.join("\n")}`;
    }
    systemPrompt += `\n\n${behaviorContext}`;

    // Stream response
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-5-20250929",
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
          console.error("Wochencheck stream error:", err);
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
