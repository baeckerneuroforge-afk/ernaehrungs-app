import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin-audit";
import { getAdminUserId } from "@/lib/auth-guard";
import { validateBody, adminReplySchema } from "@/lib/validations";

// GET: admin fetches all messages with user names
export async function GET() {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await logAdminAction({
    adminId: adminUserId,
    action: "view_messages",
    resourceType: "message",
  });

  const admin = createSupabaseAdmin();

  const { data: messages, error } = await admin
    .from("ea_messages")
    .select("id, user_id, content, admin_reply, replied_at, is_read, created_at")
    .order("created_at", { ascending: false });

  if (error) { console.error("[admin/nachrichten] db error:", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }

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
  const adminUserId = await getAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const validation = validateBody(adminReplySchema, await request.json().catch(() => ({})));
  if (!validation.success) {
    return NextResponse.json({ error: "invalid_input", message: validation.error }, { status: 400 });
  }
  const { id, reply } = validation.data;

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("ea_messages")
    .update({
      admin_reply: reply.trim(),
      replied_at: new Date().toISOString(),
      is_read: true,
    })
    .eq("id", id)
    .select("id")
    .limit(1);

  if (error) { console.error("[admin/nachrichten] db error:", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  if (!data?.length) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Log only after the reply actually persisted (avoids phantom audit entries).
  await logAdminAction({
    adminId: adminUserId,
    action: "reply_message",
    resourceType: "message",
    resourceId: id,
  });

  return NextResponse.json({ success: true });
}

// PATCH for marking as read (separate action)
export async function PUT(request: Request) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await request.json();
  const admin = createSupabaseAdmin();
  await admin.from("ea_messages").update({ is_read: true }).eq("id", id);
  return NextResponse.json({ success: true });
}
