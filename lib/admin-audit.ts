import { createSupabaseAdmin } from "@/lib/supabase/server";

export type AdminAuditAction =
  | "view_messages"
  | "reply_message"
  | "view_chat_history"
  | "view_quality"
  | "view_audit_log"
  | "upload_document"
  | "delete_document"
  | "upload_qa"
  | "publish_blog"
  | "unpublish_blog"
  | "create_blog"
  | "update_blog"
  | "delete_blog";

interface LogAdminActionParams {
  adminId: string;
  action: AdminAuditAction | string;
  resourceType: string;
  resourceId?: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes an audit-log entry for an admin action.
 * Errors are swallowed so audit logging never blocks the actual request.
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<void> {
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from("ea_admin_audit_log").insert({
      admin_id: params.adminId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      target_user_id: params.targetUserId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    console.error("[admin-audit] failed to write log entry:", err);
  }
}
