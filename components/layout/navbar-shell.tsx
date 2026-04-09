"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Leaf,
  LogOut,
  Menu,
  X,
  Settings,
  MessageCircle,
  CalendarDays,
  BookOpen,
  LineChart,
  User as UserIcon,
} from "lucide-react";
import { CreditBadge } from "@/components/credit-badge";

export function NavbarShell({
  user,
  signOut,
}: {
  user: { publicMetadata?: Record<string, unknown> } | null;
  signOut: (opts?: { redirectUrl?: string }) => void;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    const role = (user.publicMetadata as { role?: string })?.role;
    if (role === "admin") {
      setIsAdmin(true);
    } else {
      fetch("/api/auth/role")
        .then((r) => r.json())
        .then((data) => setIsAdmin(data.role === "admin"))
        .catch(() => setIsAdmin(false));
    }
  }, [user]);

  // Close drawer when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/chat", label: "Chat", icon: MessageCircle },
    { href: "/ernaehrungsplan", label: "Plan", icon: CalendarDays },
    { href: "/tagebuch", label: "Tagebuch", icon: BookOpen },
    { href: "/tracker", label: "Tracker", icon: LineChart },
    { href: "/profil", label: "Profil", icon: UserIcon },
  ];

  function isActive(href: string) {
    return pathname?.startsWith(href);
  }

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-card group-hover:shadow-card-hover transition-all duration-200">
                <Leaf className="w-[18px] h-[18px] text-white" />
              </div>
              <span className="font-serif text-[17px] font-semibold text-ink hidden sm:block tracking-tight">
                Ernährungsberatung
              </span>
            </Link>

            {/* Desktop Nav — pill style */}
            <div className="hidden md:flex items-center gap-1">
              {user ? (
                <>
                  {navLinks.map((link) => {
                    const active = isActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`px-3.5 py-1.5 rounded-full text-sm transition-all duration-200 ${
                          active
                            ? "bg-primary-pale text-primary font-medium"
                            : "text-ink-muted hover:text-ink hover:bg-surface-muted"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </>
              ) : (
                <Link
                  href="/blog"
                  className={`px-3.5 py-1.5 rounded-full text-sm transition-all duration-200 ${
                    isActive("/blog")
                      ? "bg-primary-pale text-primary font-medium"
                      : "text-ink-muted hover:text-ink hover:bg-surface-muted"
                  }`}
                >
                  Blog
                </Link>
              )}
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <div className="hidden md:block">
                    <CreditBadge />
                  </div>
                  {isAdmin && (
                    <Link
                      href="/admin/dashboard"
                      className="hidden md:flex items-center gap-1.5 text-xs font-medium bg-primary-pale text-primary px-3 py-1.5 rounded-full hover:bg-primary/15 transition-all duration-200"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ redirectUrl: "/" })}
                    className="hidden md:flex items-center gap-1.5 text-sm text-ink-muted hover:text-red-500 px-3 py-1.5 rounded-full hover:bg-surface-muted transition-all duration-200 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden lg:inline">Abmelden</span>
                  </button>
                  {/* Mobile hamburger */}
                  <button
                    className="md:hidden p-2 text-ink-muted cursor-pointer hover:text-ink transition"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Menü öffnen"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="text-sm font-medium text-ink-muted hover:text-primary transition-all duration-200 px-3 py-1.5"
                  >
                    Anmelden
                  </Link>
                  <Link
                    href="/sign-up"
                    className="text-sm font-medium bg-primary text-white px-5 py-2 rounded-full hover:bg-primary-hover transition-all duration-200 shadow-card"
                  >
                    Kostenlos starten
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile slide-in drawer */}
      {user && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-50 bg-black/30 md:hidden transition-opacity duration-200 ${
              menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer */}
          <aside
            className={`fixed top-0 right-0 bottom-0 z-50 w-[82%] max-w-sm bg-white shadow-pop md:hidden transition-transform duration-300 ease-out ${
              menuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between px-5 py-5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                  <Leaf className="w-[18px] h-[18px] text-white" />
                </div>
                <span className="font-serif text-base font-semibold text-ink">
                  Menü
                </span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-full hover:bg-surface-muted text-ink-muted transition"
                aria-label="Menü schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-3">
              <CreditBadge />
            </div>

            <nav className="px-3 space-y-1">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] transition-all duration-200 ${
                      active
                        ? "bg-primary-pale text-primary font-medium"
                        : "text-ink-muted hover:text-ink hover:bg-surface-muted"
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    {link.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] text-ink-muted hover:text-primary hover:bg-primary-pale transition-all duration-200"
                >
                  <Settings className="w-[18px] h-[18px]" />
                  Admin-Bereich
                </Link>
              )}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
              <button
                onClick={() => signOut({ redirectUrl: "/" })}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm text-ink-muted hover:text-red-500 hover:bg-red-50 border border-border transition-all duration-200 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Abmelden
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
