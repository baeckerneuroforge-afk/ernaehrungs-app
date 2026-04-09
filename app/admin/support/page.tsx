import { createSupabaseAdmin } from "@/lib/supabase/server";
import { SupportAdminClient } from "./support-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ea_support_tickets")
    .select("id, user_id, name, email, subject, message, status, admin_notes, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return <SupportAdminClient initialTickets={data || []} />;
}
