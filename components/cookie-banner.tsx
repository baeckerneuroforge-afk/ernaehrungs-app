"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import posthog from "posthog-js";

/**
 * v2: Vorher gab es nur "Verstanden" und wir behaupteten, ausschließlich
 * technisch notwendige Cookies zu verwenden. Mit der PostHog-Integration
 * stimmt das nicht mehr — wir brauchen jetzt eine echte Accept/Decline-
 * Entscheidung. Storage-Key gebumpt, damit bestehende User erneut
 * gefragt werden.
 */
const STORAGE_KEY = "ea_cookie_consent_v2";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  // Banner darf den Auth-/Onboarding-Flow nicht stören. Auf Mobile überdeckte
  // die vorherige bottom-bar-Variante Clerks Submit-Button, was als
  // "Sign-up lädt nicht" gemeldet wurde. Wir verstecken den Banner komplett
  // auf:
  //   - /sign-up, /sign-in   → Clerk-Form
  //   - /auth-callback        → kurzer Spinner zwischen Sign-in und Ziel
  //   - /onboarding           → Wizard mit eigenen Submit-Buttons
  // Nach abgeschlossenem Onboarding landet der User auf /chat oder /home,
  // dort sieht er den Banner und kann eine Entscheidung treffen.
  const hideOnRoute =
    pathname?.startsWith("/sign-up") ||
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/auth-callback") ||
    pathname?.startsWith("/onboarding");

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage may be unavailable – ignore
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // ignore
    }
    try {
      posthog.opt_in_capturing();
    } catch {
      // posthog not yet initialized — ignore
    }
    setVisible(false);
  }

  function decline() {
    try {
      localStorage.setItem(STORAGE_KEY, "declined");
    } catch {
      // ignore
    }
    try {
      posthog.opt_out_capturing();
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible || hideOnRoute) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie- und Tracking-Hinweis"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-fade-up"
    >
      <div className="bg-white border border-sage/40 shadow-lg rounded-2xl px-5 py-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 mt-2 rounded-full bg-sage flex-shrink-0" />
          <p className="text-xs sm:text-sm text-warm-text leading-relaxed flex-1">
            Wir nutzen technisch notwendige Cookies für die Anmeldung sowie
            optionale Analyse-Tools (PostHog, EU-gehostet) zur
            Produktverbesserung. Inhalte deiner Chats und Gesundheitsdaten
            werden dabei nicht erfasst. Mehr in unserer{" "}
            <Link
              href="/datenschutz"
              className="text-primary hover:underline font-medium"
            >
              Datenschutzerklärung
            </Link>
            .
          </p>
          <button
            onClick={decline}
            aria-label="Schließen — Tracking ablehnen"
            className="text-warm-light hover:text-warm-dark transition flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={decline}
            className="text-xs font-medium border border-sage/40 hover:bg-sage/10 text-warm-dark px-4 py-2 rounded-full transition"
          >
            Ablehnen
          </button>
          <button
            onClick={accept}
            className="text-xs font-medium bg-sage hover:bg-sage/80 text-warm-dark px-5 py-2 rounded-full transition"
          >
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
