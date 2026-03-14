import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { chunkText } from "@/lib/utils/chunking";
import OpenAI from "openai";
import { NextResponse } from "next/server";

async function checkAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ea_user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);
  if (data?.[0]?.role !== "admin") return null;
  return userId;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const adminUserId = await checkAdmin();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createSupabaseAdmin();

  const { action, add_to_wissensbasis } = await request.json();

  // Get current post
  const { data: postData } = await supabase
    .from("ea_blog_posts")
    .select("*")
    .eq("id", params.id)
    .limit(1);

  const post = postData?.[0];
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "publish") {
    // Publish
    const updates: Record<string, unknown> = {
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add to wissensbasis if requested
    if (add_to_wissensbasis && post.content.trim()) {
      const source = `blog:${post.slug}`;

      // Remove existing entries first (in case of re-publish)
      await supabase.from("ea_documents").delete().eq("source", source);

      const chunks = chunkText(post.content);
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const title = chunks.length > 1
          ? `${post.title} (${i + 1}/${chunks.length})`
          : post.title;

        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunk,
        });

        const embedding = embeddingResponse.data[0].embedding;

        await supabase.from("ea_documents").insert({
          title,
          content: chunk,
          source,
          embedding: JSON.stringify(embedding),
        });
      }

      updates.in_wissensbasis = true;
    }

    const { error } = await supabase
      .from("ea_blog_posts")
      .update(updates)
      .eq("id", params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: "published" });

  } else if (action === "unpublish") {
    // Unpublish
    const { error } = await supabase
      .from("ea_blog_posts")
      .update({
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: "draft" });
  }

  return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
}
