import { createSupabaseAdmin } from "@/lib/supabase/server";
import { chunkText } from "@/lib/utils/chunking";
import { getOpenAI } from "@/lib/openai-client";
import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { logAdminAction } from "@/lib/admin-audit";
import { getAdminUserId } from "@/lib/auth-guard";
import { checkRateLimit, documentsLimiter } from "@/lib/rate-limit";
import {
  createUsageRequestId,
  extractOpenAIEmbeddingTokens,
  logUsage,
} from "@/lib/usage-logging";

// Cap upload size before loading the whole file into memory (pdf-parse/mammoth
// read the entire buffer) — a huge upload could otherwise OOM the function.
const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB
// Obergrenze für die Chunk-Anzahl pro Dokument — verhindert Kosten-Spikes
// (jeder Chunk = ein Embedding-Call) und ungewollt riesige RAG-Ingests.
const MAX_DOC_CHUNKS = 400;

// GET: List all documents (grouped by source)
export async function GET() {
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("ea_documents")
    .select("id, title, source, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[documents] db error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
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
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rl = await checkRateLimit(documentsLimiter, adminId);
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Zu viele Uploads. Bitte warte einen Moment." },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
    }

    if (file.size > MAX_DOC_BYTES) {
      return NextResponse.json(
        { error: "Datei zu groß (max. 10 MB)" },
        { status: 413 }
      );
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

    if (chunks.length > MAX_DOC_CHUNKS) {
      return NextResponse.json(
        {
          error: "too_many_chunks",
          message: `Dokument zu groß: ${chunks.length} Abschnitte (max. ${MAX_DOC_CHUNKS}). Bitte aufteilen.`,
        },
        { status: 413 }
      );
    }

    // Generate embeddings and insert (service role bypasses RLS)
    const openai = getOpenAI();
    const supabase = createSupabaseAdmin();
    const usageRequestId = createUsageRequestId();

    let inserted = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const title = `${fileName} (${i + 1}/${chunks.length})`;

      const embeddingStartedAt = Date.now();
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });
      const embeddingTokens = extractOpenAIEmbeddingTokens(embeddingResponse, chunk);
      void logUsage({
        userId: adminId,
        plan: "admin",
        endpoint: "admin-documents",
        action: "embedding-ingest",
        model: "openai-text-embedding-3-small",
        inputTokens: embeddingTokens,
        embeddingTokens,
        requestId: usageRequestId,
        durationMs: Date.now() - embeddingStartedAt,
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

    await logAdminAction({
      adminId,
      action: "upload_document",
      resourceType: "document",
      metadata: { fileName, chunks: chunks.length, inserted },
    });

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
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { source } = await request.json();

  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("ea_documents")
    .delete()
    .eq("source", source);

  if (error) {
    console.error("[documents] db error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  await logAdminAction({
    adminId,
    action: "delete_document",
    resourceType: "document",
    resourceId: source,
  });

  return NextResponse.json({ success: true });
}
