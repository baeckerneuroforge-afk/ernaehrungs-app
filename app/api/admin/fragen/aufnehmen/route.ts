import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { chunkText } from "@/lib/utils/chunking";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin-audit";

export async function POST(request: Request) {
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

  const { question_text, answer_text } = await request.json();

  if (!question_text || !answer_text) {
    return NextResponse.json(
      { error: "question_text und answer_text erforderlich" },
      { status: 400 }
    );
  }

  await logAdminAction({
    adminId: userId,
    action: "upload_qa",
    resourceType: "document",
    metadata: { title: question_text.slice(0, 80) },
  });

  const fullText = `Frage: ${question_text}\n\nAntwort: ${answer_text}`;
  const title = question_text.slice(0, 80);
  const source = "admin_fragen";

  const chunks = chunkText(fullText);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let inserted = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkTitle =
      chunks.length > 1 ? `${title} (${i + 1}/${chunks.length})` : title;

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk,
    });

    const embedding = embeddingResponse.data[0].embedding;

    const { error } = await supabase.from("ea_documents").insert({
      title: chunkTitle,
      content: chunk,
      source,
      embedding: JSON.stringify(embedding),
    });

    if (!error) inserted++;
  }

  return NextResponse.json({ success: true, chunks: chunks.length, inserted });
}
