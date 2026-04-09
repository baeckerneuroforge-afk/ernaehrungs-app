"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";
import {
  MessageCircle,
  CalendarDays,
  BookOpen,
  LineChart,
  User as UserIcon,
} from "lucide-react";

/**
 * Mobile-only fixed bottom navigation. Hidden on md+ breakpoints.
 * Rendered globally in app/layout.tsx for authenticated users.
 */
export function BottomNav() {
  const pathname = usePathname() ?? "";

  const items = [
    { href: "/chat", label: "Chat", icon: MessageCircle },
    { href: "/ernaehrungsplan", label: "Plan", icon: CalendarDays },
    { href: "/tagebuch", label: "Tagebuch", icon: BookOpen },
    { href: "/tracker", label: "Tracker", icon: LineChart },
    { href: "/profil", label: "Profil", icon: UserIcon },
  ];

  // Hide on marketing / auth / onboarding / chat pages.
  // Chat is a full-screen focused experience (100dvh) with its own hamburger nav.
  const hiddenRoutes = [
    "/",
    "/sign-in",
    "/sign-up",
    "/onboarding",
    "/impressum",
    "/datenschutz",
    "/agb",
    "/blog",
    "/chat",
  ];
  const isHidden =
    pathname === "/" ||
    hiddenRoutes.some(
      (r) => r !== "/" && (pathname === r || pathname.startsWith(r + "/"))
    ) ||
    pathname.startsWith("/admin");

  if (isHidden) return null;

  return (
    <SignedIn>
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-md border-t border-border pb-safe"
      aria-label="Hauptnavigation"
    >
      <ul className="flex items-stretch justify-around px-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-all duration-200 ${
                  active ? "text-primary" : "text-ink-faint hover:text-ink-muted"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-11 h-7 rounded-full transition-all duration-200 ${
                    active ? "bg-primary-pale" : ""
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
    </SignedIn>
  );
}
