import { createSupabaseAdmin } from "@/lib/supabase/server";
import { chunkText } from "@/lib/utils/chunking";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

// GET: List all documents (grouped by source)
export async function GET() {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("ea_documents")
    .select("id, title, source, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by source
  const grouped: Record<string, { source: string; chunks: number; created_at: string; ids: string[] }> = {};
  for (const doc of data || []) {
    const key = doc.source || doc.title;
    if (!grouped[key]) {
      grouped[key] = { source: key, chunks: 0, created_at: doc.created_at, ids: [] };
    }
    grouped[key].chunks++;
    grouped[key].ids.push(doc.id);
  }

  return NextResponse.json(Object.values(grouped));
}

// POST: Upload and ingest a document
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
    }

    let text = "";
    const fileName = file.name;
    const ext = fileName.toLowerCase().split(".").pop();

    if (ext === "txt" || ext === "md") {
      text = await file.text();
    } else if (ext === "pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } else if (ext === "docx") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json(
        { error: "Unterstützte Formate: .txt, .md, .pdf, .docx" },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "Leere Datei oder kein Text erkannt" }, { status: 400 });
    }

    // Chunk the text
    const chunks = chunkText(text);

    // Generate embeddings and insert (service role bypasses RLS)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const supabase = createSupabaseAdmin();

    let inserted = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const title = `${fileName} (${i + 1}/${chunks.length})`;

      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      const embedding = embeddingResponse.data[0].embedding;

      const { error } = await supabase.from("ea_documents").insert({
        title,
        content: chunk,
        source: fileName,
        embedding: JSON.stringify(embedding),
      });

      if (!error) inserted++;
    }

    return NextResponse.json({
      success: true,
      fileName,
      chunks: chunks.length,
      inserted,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
  }
}

// DELETE: Remove a document source
export async function DELETE(request: Request) {
  const { source } = await request.json();

  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("ea_documents")
    .delete()
    .eq("source", source);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
