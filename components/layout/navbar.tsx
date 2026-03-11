"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { Leaf, LogOut, Menu, X, Settings } from "lucide-react";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("ea_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .then(({ data }) => setIsAdmin(data?.[0]?.role === "admin"));
  }, [user, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const navLinks = [
    { href: "/chat", label: "Chat" },
    { href: "/ernaehrungsplan", label: "Ernährungsplan" },
    { href: "/tagebuch", label: "Tagebuch" },
    { href: "/tracker", label: "Tracker" },
    { href: "/profil", label: "Mein Profil" },
  ];

  function isActive(href: string) {
    return pathname?.startsWith(href);
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-gray-800 hidden sm:block">
              Ernährungsberatung
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-5">
            <Link
              href="/blog"
              className={`text-sm transition ${
                isActive("/blog")
                  ? "text-primary font-medium"
                  : "text-gray-600 hover:text-primary"
              }`}
            >
              Blog
            </Link>
            {user ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm transition ${
                      isActive(link.href)
                        ? "text-primary font-medium"
                        : "text-gray-600 hover:text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-1 text-xs font-medium bg-primary-bg text-primary px-2.5 py-1 rounded-full hover:bg-primary-pale transition"
                  >
                    <Settings className="w-3 h-3" />
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Abmelden
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-primary hover:text-primary-light transition"
                >
                  Anmelden
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light transition"
                >
                  Kostenlos starten
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-gray-100">
            {user ? (
              <div className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm px-2 py-1 ${
                      isActive(link.href)
                        ? "text-primary font-medium"
                        : "text-gray-600 hover:text-primary"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    className="text-sm text-primary font-medium px-2 py-1"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin-Bereich
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="text-sm text-gray-500 hover:text-red-500 px-2 py-1 text-left"
                >
                  Abmelden
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href="/blog"
                  className={`text-sm px-2 py-1 ${
                    isActive("/blog")
                      ? "text-primary font-medium"
                      : "text-gray-600 hover:text-primary"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  Blog
                </Link>
                <Link
                  href="/login"
                  className="text-sm text-primary font-medium px-2 py-1"
                  onClick={() => setMenuOpen(false)}
                >
                  Anmelden
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg text-center"
                  onClick={() => setMenuOpen(false)}
                >
                  Kostenlos starten
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
