import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function checkAdmin() {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("ea_user_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1);
  return data?.[0]?.role === "admin" ? user : null;
}

// GET: admin fetches all messages with user names
export async function GET() {
  const admin_user = await checkAdmin();
  if (!admin_user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createSupabaseAdmin();

  const { data: messages, error } = await admin
    .from("ea_messages")
    .select("id, user_id, content, admin_reply, replied_at, is_read, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch user names from profiles
  const userIds = Array.from(new Set((messages || []).map((m) => m.user_id)));
  const { data: profiles } = await admin
    .from("ea_profiles")
    .select("user_id, name")
    .in("user_id", userIds);

  const nameById: Record<string, string> = Object.fromEntries(
    (profiles || []).map((p) => [p.user_id, p.name || "Unbekannt"])
  );

  const result = (messages || []).map((m) => ({
    ...m,
    user_name: nameById[m.user_id] || "Unbekannt",
  }));

  return NextResponse.json(result);
}

// PATCH: admin replies to a message
export async function PATCH(request: Request) {
  const admin_user = await checkAdmin();
  if (!admin_user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, reply } = await request.json();
  if (!id || !reply?.trim()) {
    return NextResponse.json({ error: "ID und Antwort erforderlich" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("ea_messages")
    .update({
      admin_reply: reply.trim(),
      replied_at: new Date().toISOString(),
      is_read: true,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH for marking as read (separate action)
export async function PUT(request: Request) {
  const admin_user = await checkAdmin();
  if (!admin_user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await request.json();
  const admin = createSupabaseAdmin();
  await admin.from("ea_messages").update({ is_read: true }).eq("id", id);
  return NextResponse.json({ success: true });
}
