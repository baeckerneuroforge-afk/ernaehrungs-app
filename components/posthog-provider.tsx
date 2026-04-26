"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

/**
 * Tracking-Consent-Storage. v2 = mit explizitem Accept/Decline (vorher v1
 * nur "Verstanden"). Werte: "accepted" | "declined". Sonstige/fehlende
 * Werte werden als "noch nicht entschieden" behandelt — PostHog bleibt
 * dann opt-out (siehe `opt_out_capturing_by_default` unten).
 */
const CONSENT_KEY = "ea_cookie_consent_v2";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    // Sentry handled errors. Doppeltes Tracking ist Lärm + zusätzliche
    // PII-Exposition, daher hier aus.
    capture_exceptions: false,
    debug: process.env.NODE_ENV === "development",
    // GDPR-Defaults: Tracking startet ausgeschaltet — User muss aktiv
    // im Cookie-Banner zustimmen (siehe components/cookie-banner.tsx).
    opt_out_capturing_by_default: true,
    respect_dnt: true,
    // Falls Session-Replays je aktiviert werden: Form-Inputs maskieren
    // (Profildaten, Allergien, Gewichtsangaben). Text bleibt sichtbar
    // (kein maskTextSelector gesetzt), damit Funnel-Analysen sinnvoll
    // bleiben. session_recording ist das aktuelle posthog-js-API; die
    // Top-Level-Optionen mask_all_inputs / mask_all_text aus älteren
    // SDK-Versionen existieren in den Typen nicht mehr.
    session_recording: {
      maskAllInputs: true,
    },
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Bestehende Choice aus localStorage anwenden — der Init-Default ist
  // opt-out, also greift hier nur das aktive Opt-In bzw. ein erneutes
  // Opt-Out (defensiv, falls posthog-js den State über Reloads anders
  // restaurieren würde).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const consent = localStorage.getItem(CONSENT_KEY);
      if (consent === "accepted") {
        posthog.opt_in_capturing();
      } else if (consent === "declined") {
        posthog.opt_out_capturing();
      }
    } catch {
      // localStorage unavailable — bleibt beim Init-Default opt-out.
    }
  }, []);

  return <>{children}</>;
}
