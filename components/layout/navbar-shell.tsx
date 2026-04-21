"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, useUser, useAuth, useClerk } from "@clerk/nextjs";
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
  Lock,
  HelpCircle,
  FileText,
  Home,
} from "lucide-react";
import { CreditBadge } from "@/components/credit-badge";
import { hasFeatureAccess, type Feature } from "@/lib/feature-gates";

export function NavbarShell() {
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();
  useAuth(); // subscribe to auth state changes

  const [isAdmin, setIsAdmin] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Sign-Out needs to fully reset client-side state. Just signOut() +
  // Clerk's built-in redirect isn't enough because:
  //   1. A Next router push leaves Server Component renders (especially
  //      the app layouts with requireOnboardedUser()) mounted with their
  //      signed-in output → navbar flickers stale.
  //   2. The Service Worker caches static assets tied to the previous
  //      session's chunk hashes; Safari/Firefox will happily serve an
  //      old navbar bundle back after a hard navigation.
  //   3. Back-Forward Cache (BFCache) on Safari/Firefox freezes the tab
  //      including React state; Back-button can resurrect the signed-in
  //      navbar.
  // We address all three: delete all SW caches, unregister the SW, then
  // hard-navigate with a cache-busting query string.
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      // Swallow — Clerk occasionally throws on unmount timing. We still
      // want to navigate so the user isn't stranded on a signed-in page.
      console.error("[navbar] signOut error (continuing anyway):", err);
    }

    // Best-effort Browser-State-Invalidation. Any failure here is non-fatal —
    // the hard navigation below is the real guarantee.
    try {
      if (typeof window !== "undefined" && "caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (err) {
      console.warn("[navbar] cache/SW cleanup failed (non-fatal):", err);
    }

    // Hard navigation with cache-bust — defeats BFCache and any stale
    // HTTP-cached /-response the browser might try to serve.
    window.location.href = `/?_t=${Date.now()}`;
  };

  // Fetch plan + admin status whenever the signed-in user changes
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setIsAdmin(false);
      setUserPlan("free");
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

    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUserPlan(data?.plan || "free"))
      .catch(() => setUserPlan("free"));
  }, [isLoaded, user]);

  // Close drawer when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close drawer on ESC key
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navLinks: {
    href: string;
    label: string;
    icon: typeof MessageCircle;
    feature?: Feature;
    tour?: string;
  }[] = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/chat", label: "Chat", icon: MessageCircle, feature: "chat" },
    { href: "/ernaehrungsplan", label: "Plan", icon: CalendarDays, feature: "plan", tour: "plan" },
    { href: "/tagebuch", label: "Tagebuch", icon: BookOpen, feature: "tagebuch", tour: "tagebuch" },
    { href: "/tracker", label: "Tracker", icon: LineChart, feature: "tracker", tour: "tracker" },
    { href: "/reports", label: "Reports", icon: FileText, feature: "monthly_report" },
    { href: "/profil", label: "Profil", icon: UserIcon },
  ];

  // Admins bypass all feature locks
  const isLocked = (feature?: Feature) =>
    feature && !isAdmin ? !hasFeatureAccess(userPlan, feature) : false;

  function isActive(href: string) {
    return pathname?.startsWith(href);
  }

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-card group-hover:shadow-card-hover transition-all duration-200">
                <Leaf className="w-[18px] h-[18px] text-white" />
              </div>
              <span className="font-serif text-[19px] hidden sm:flex items-baseline tracking-tight">
                <span className="font-bold text-primary">Nutriva</span>
                <span className="font-normal text-sage">-AI</span>
              </span>
            </Link>

            {/* Desktop Nav — pill style */}
            <div className="hidden md:flex items-center gap-1">
              {!isLoaded ? (
                <>
                  <div className="h-7 w-16 rounded-full bg-surface-muted animate-pulse" />
                  <div className="h-7 w-16 rounded-full bg-surface-muted animate-pulse" />
                  <div className="h-7 w-16 rounded-full bg-surface-muted animate-pulse" />
                </>
              ) : (
                <>
                  <SignedIn>
                    {navLinks.map((link) => {
                      const active = isActive(link.href);
                      const locked = isLocked(link.feature);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          data-tour={link.tour}
                          className={`px-3.5 py-1.5 rounded-full text-sm transition-all duration-200 inline-flex items-center gap-1.5 ${
                            active
                              ? "bg-primary-pale text-primary font-medium"
                              : "text-ink-muted hover:text-ink hover:bg-surface-muted"
                          }`}
                        >
                          {link.label}
                          {locked && <Lock className="w-3 h-3 text-ink-faint" />}
                        </Link>
                      );
                    })}
                  </SignedIn>
                  <SignedOut>
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
                  </SignedOut>
                </>
              )}
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-2">
              {!isLoaded ? (
                <div className="h-8 w-24 rounded-full bg-surface-muted animate-pulse" />
              ) : (
                <>
                  <SignedIn>
                    <div className="hidden md:block">
                      <CreditBadge isAdmin={isAdmin} />
                    </div>
                    <Link
                      href="/support"
                      className="hidden md:flex items-center justify-center w-8 h-8 rounded-full text-ink-muted hover:text-primary hover:bg-primary-pale transition-all duration-200"
                      aria-label="Hilfe & Support"
                      title="Hilfe & Support"
                    >
                      <HelpCircle className="w-[18px] h-[18px]" />
                    </Link>
                    <Link
                      href="/einstellungen"
                      className="hidden md:flex items-center justify-center w-8 h-8 rounded-full text-ink-muted hover:text-primary hover:bg-primary-pale transition-all duration-200"
                      aria-label="Einstellungen"
                      title="Einstellungen"
                    >
                      <Settings className="w-[18px] h-[18px]" />
                    </Link>
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
                      onClick={handleSignOut}
                      className="hidden md:flex items-center gap-1.5 text-sm text-ink-muted hover:text-red-500 px-3 py-1.5 rounded-full hover:bg-surface-muted transition-all duration-200 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden lg:inline">Abmelden</span>
                    </button>
                    {/* Mobile hamburger */}
                    <button
                      className="md:hidden p-3 w-11 h-11 flex items-center justify-center rounded-lg text-ink-muted cursor-pointer hover:text-ink hover:bg-surface-muted transition"
                      onClick={() => setMenuOpen(true)}
                      aria-label="Menü öffnen"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                  </SignedIn>
                  <SignedOut>
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
                  </SignedOut>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile slide-in drawer */}
      <SignedIn>
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
            <CreditBadge isAdmin={isAdmin} />
          </div>

          <nav className="px-3 space-y-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              const Icon = link.icon;
              const locked = isLocked(link.feature);
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
                  <span className="flex-1">{link.label}</span>
                  {locked && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                </Link>
              );
            })}
            <Link
              href="/einstellungen"
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] text-ink-muted hover:text-primary hover:bg-primary-pale transition-all duration-200"
            >
              <Settings className="w-[18px] h-[18px]" />
              Einstellungen
            </Link>
            <Link
              href="/support"
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] text-ink-muted hover:text-primary hover:bg-primary-pale transition-all duration-200"
            >
              <HelpCircle className="w-[18px] h-[18px]" />
              Hilfe & Support
            </Link>
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
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm text-ink-muted hover:text-red-500 hover:bg-red-50 border border-border transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Abmelden
            </button>
          </div>
        </aside>
      </SignedIn>
    </>
  );
}
