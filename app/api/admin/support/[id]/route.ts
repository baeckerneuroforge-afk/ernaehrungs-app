import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
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

const ALLOWED_STATUS = ["open", "in_progress", "closed"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const adminUserId = await checkAdmin();
  if (!adminUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { status, admin_notes } = body as {
    status?: string;
    admin_notes?: string;
  };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (status !== undefined) {
    if (!ALLOWED_STATUS.includes(status as (typeof ALLOWED_STATUS)[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = status;
  }

  if (admin_notes !== undefined) {
    updates.admin_notes = admin_notes || null;
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("ea_support_tickets")
    .update(updates)
    .eq("id", params.id)
    .select()
    .limit(1);

  if (error) {
    console.error("[admin/support/:id] db error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  await logAdminAction({
    adminId: adminUserId,
    action: "update_support_ticket",
    resourceType: "support_ticket",
    resourceId: params.id,
    metadata: { status },
  });

  return NextResponse.json({ ticket: data?.[0] });
}
