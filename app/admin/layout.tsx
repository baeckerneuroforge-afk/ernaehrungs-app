import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, MessageSquare, BookOpen, FileText, Star, Inbox, ArrowLeft, ScrollText, LifeBuoy } from "lucide-react";

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

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: BarChart3, badge: 0 },
    { href: "/admin/fragen", label: "Fragen", icon: MessageSquare, badge: 0 },
    { href: "/admin/wissensbasis", label: "Wissensbasis", icon: BookOpen, badge: 0 },
    { href: "/admin/blog", label: "Blog", icon: FileText, badge: 0 },
    { href: "/admin/qualitaet", label: "Qualität", icon: Star, badge: 0 },
    { href: "/admin/nachrichten", label: "Nachrichten", icon: Inbox, badge: pendingMessages },
    { href: "/admin/support", label: "Support", icon: LifeBuoy, badge: pendingSupport },
    { href: "/admin/audit", label: "Audit-Log", icon: ScrollText, badge: 0 },
  ];

  return (
    <div className="min-h-screen flex bg-surface-bg">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">
            Admin-Bereich
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-primary-bg hover:text-primary transition"
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <Link
            href="/chat"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur App
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
