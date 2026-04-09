"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  MessageSquare,
  BookOpen,
  FileText,
  Star,
  Inbox,
  ArrowLeft,
  ScrollText,
  LifeBuoy,
  Menu,
  X,
} from "lucide-react";

interface Props {
  children: React.ReactNode;
  pendingMessages: number;
  pendingSupport: number;
}

export function AdminShell({
  children,
  pendingMessages,
  pendingSupport,
}: Props) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  const current = navItems.find((n) => pathname.startsWith(n.href));

  const SidebarContent = (
    <>
      <div className="p-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider">
          Admin-Bereich
        </p>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition ${
                active
                  ? "bg-primary-pale text-primary font-medium"
                  : "text-gray-600 hover:bg-primary-bg hover:text-primary"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
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
    </>
  );

  return (
    <div className="min-h-screen flex bg-surface-bg">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col">
        {SidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-gray-100 h-14 flex items-center justify-between px-4">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 text-gray-600 hover:text-primary"
          aria-label="Menü öffnen"
        >
          <Menu className="w-5 h-5" />
        </button>
        <p className="text-sm font-semibold text-ink truncate">
          {current?.label || "Admin"}
        </p>
        <Link
          href="/chat"
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Zurück
        </Link>
      </div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`md:hidden fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[82%] bg-white shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">
            Admin-Bereich
          </p>
          <button
            onClick={() => setOpen(false)}
            className="p-2 -mr-2 text-gray-500 hover:text-ink"
            aria-label="Menü schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm transition ${
                  active
                    ? "bg-primary-pale text-primary font-medium"
                    : "text-gray-600 hover:bg-primary-bg hover:text-primary"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
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

      {/* Main content */}
      <main className="flex-1 p-4 pt-[4.5rem] md:p-8 md:pt-8 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
