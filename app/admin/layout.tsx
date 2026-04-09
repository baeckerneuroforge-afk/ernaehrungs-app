import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const admin = createSupabaseAdmin();

  const { data: roleData } = await admin
    .from("ea_user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);

  if (roleData?.[0]?.role !== "admin") redirect("/chat");

  // Fetch unanswered message count
  const { count: unreadCount } = await admin
    .from("ea_messages")
    .select("id", { count: "exact", head: true })
    .is("admin_reply", null);

  const pendingMessages = unreadCount ?? 0;

  // Fetch open support tickets count
  const { count: openTickets } = await admin
    .from("ea_support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  const pendingSupport = openTickets ?? 0;

  return (
    <AdminShell
      pendingMessages={pendingMessages}
      pendingSupport={pendingSupport}
    >
      {children}
    </AdminShell>
  );
}
