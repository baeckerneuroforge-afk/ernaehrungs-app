import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const GERMAN_STOPWORDS = new Set([
  "ich", "du", "er", "sie", "es", "wir", "ihr", "die", "der", "das",
  "ein", "eine", "einer", "einem", "einen", "eines", "und", "oder", "aber",
  "nicht", "ist", "bin", "hat", "haben", "sein", "war", "wird", "werden",
  "kann", "mit", "für", "fuer", "auf", "in", "zu", "von", "an", "bei",
  "nach", "wie", "was", "wo", "wann", "warum", "welche", "welchen", "welcher",
  "mein", "dein", "sein", "ihr", "unser", "euer", "auch", "noch", "so",
  "wenn", "dann", "dass", "ob", "weil", "da", "hier", "dort", "immer",
  "schon", "sehr", "mehr", "nur", "viel", "gut", "habe", "bitte",
  "mal", "mir", "mich", "dich", "ihm", "sich", "man", "gibt", "gibt",
  "diese", "dieser", "diesem", "diesen", "jede", "jeder", "jedem", "jeden",
  "alle", "allem", "allen", "aller", "alles", "andere", "anderen", "anderer",
  "denn", "doch", "also", "zwar", "dort", "nun", "wohl", "ganz", "eben",
  "dazu", "daran", "dafür", "davon", "darauf", "dabei", "damit",
  "über", "ueber", "unter", "zwischen", "durch", "gegen", "ohne",
  "zum", "zur", "vom", "beim", "ins", "ans",
  "hallo", "danke", "bitte", "gerne", "frage", "fragen",
  "kann", "kannst", "könnte", "könntest", "soll", "sollte",
  "möchte", "möchtest", "würde", "würdest", "muss", "müsste",
  "wäre", "wären", "hätte", "hätten",
  "meine", "meinen", "meinem", "deinen", "deinem", "deine",
  "seine", "seinen", "seinem", "ihre", "ihren", "ihrem",
  "sind", "seid", "waren", "gewesen",
  "hast", "habt", "hatte", "hatten",
  "wirst", "werdet", "wurde", "wurden",
  "essen", "esse", "isst", "gegessen",
]);

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  const { data: roleData } = await supabase
    .from("ea_user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);

  if (roleData?.[0]?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all user messages
  const { data: messages } = await supabase
    .from("ea_conversations")
    .select("content")
    .eq("role", "user");

  if (!messages?.length) {
    return NextResponse.json([]);
  }

  // Tokenize and count
  const wordCounts: Record<string, number> = {};

  for (const msg of messages) {
    const text = msg.content.toLowerCase().replace(/[^a-zäöüß\s]/g, " ");
    const words = text.split(/\s+/).filter((w: string) => w.length >= 4 && !GERMAN_STOPWORDS.has(w));

    const seen = new Set<string>();
    for (const word of words) {
      if (!seen.has(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
        seen.add(word);
      }
    }
  }

  // Sort by count, filter min 2 occurrences, return top 20
  const themes = Object.entries(wordCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  return NextResponse.json(themes);
}
