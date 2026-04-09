import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slugify";
import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin-audit";

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

// GET: List all blog posts (admin)
export async function GET() {
  const adminUserId = await checkAdmin();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await logAdminAction({
    adminId: adminUserId,
    action: "view_blog_list",
    resourceType: "blog_post",
  });

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("ea_blog_posts")
    .select("id, title, slug, excerpt, category, status, in_wissensbasis, published_at, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data || [] });
}

// POST: Create new blog post
export async function POST(request: Request) {
  const adminUserId = await checkAdmin();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createSupabaseAdmin();

  const body = await request.json();
  const { title, content, excerpt, category, meta_description, cover_image_url } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Titel ist erforderlich" }, { status: 400 });
  }

  let slug = slugify(title);

  // Ensure unique slug
  const { data: existing } = await supabase
    .from("ea_blog_posts")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (existing?.length) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const { data, error } = await supabase
    .from("ea_blog_posts")
    .insert({
      title: title.trim(),
      slug,
      content: content || "",
      excerpt: excerpt || null,
      category: category || null,
      meta_description: meta_description || null,
      cover_image_url: cover_image_url || null,
      author_id: adminUserId,
    })
    .select()
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    adminId: adminUserId,
    action: "create_blog",
    resourceType: "blog_post",
    resourceId: data?.[0]?.id,
    metadata: { title: title.trim(), slug },
  });

  return NextResponse.json({ post: data?.[0] });
}
