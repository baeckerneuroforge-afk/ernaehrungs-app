"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Leaf, LogOut, Menu, X, Settings } from "lucide-react";

export function Navbar() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    // Check admin role from Clerk publicMetadata or fallback to API
    const role = (user.publicMetadata as { role?: string })?.role;
    if (role === "admin") {
      setIsAdmin(true);
    } else {
      // Fallback: check via API
      fetch("/api/auth/role")
        .then((r) => r.json())
        .then((data) => setIsAdmin(data.role === "admin"))
        .catch(() => setIsAdmin(false));
    }
  }, [user]);

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
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-warm-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-warm-dark hidden sm:block">
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
                  : "text-warm-muted hover:text-primary"
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
                        : "text-warm-muted hover:text-primary"
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
                  onClick={() => signOut({ redirectUrl: "/" })}
                  className="flex items-center gap-1.5 text-sm text-warm-muted hover:text-red-500 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Abmelden
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-primary hover:text-primary-light transition"
                >
                  Anmelden
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-light transition"
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
          <div className="md:hidden pb-4 pt-2 border-t border-warm-border">
            {user ? (
              <div className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm px-2 py-1 ${
                      isActive(link.href)
                        ? "text-primary font-medium"
                        : "text-warm-muted hover:text-primary"
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
                    signOut({ redirectUrl: "/" });
                    setMenuOpen(false);
                  }}
                  className="text-sm text-warm-muted hover:text-red-500 px-2 py-1 text-left"
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
                      : "text-warm-muted hover:text-primary"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  Blog
                </Link>
                <Link
                  href="/sign-in"
                  className="text-sm text-primary font-medium px-2 py-1"
                  onClick={() => setMenuOpen(false)}
                >
                  Anmelden
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-xl text-center"
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
