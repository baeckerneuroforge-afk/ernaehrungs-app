import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
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

// GET: Single post
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const adminUserId = await checkAdmin();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("ea_blog_posts")
    .select("*")
    .eq("id", params.id)
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post: data[0] });
}

// PUT: Update post
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const adminUserId = await checkAdmin();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createSupabaseAdmin();

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const key of ["title", "content", "excerpt", "category", "meta_description", "cover_image_url"]) {
    if (key in body) updates[key] = body[key] || null;
  }

  // Keep title as non-null
  if (updates.title === null) delete updates.title;

  const { data, error } = await supabase
    .from("ea_blog_posts")
    .update(updates)
    .eq("id", params.id)
    .select()
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data?.[0] });
}

// DELETE: Delete post + remove from wissensbasis if needed
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const adminUserId = await checkAdmin();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createSupabaseAdmin();

  // Get post to check wissensbasis status
  const { data: post } = await supabase
    .from("ea_blog_posts")
    .select("slug, in_wissensbasis")
    .eq("id", params.id)
    .limit(1);

  if (post?.[0]?.in_wissensbasis) {
    await supabase
      .from("ea_documents")
      .delete()
      .eq("source", `blog:${post[0].slug}`);
  }

  const { error } = await supabase
    .from("ea_blog_posts")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
