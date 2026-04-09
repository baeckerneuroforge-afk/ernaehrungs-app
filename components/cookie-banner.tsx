"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "ea_cookie_consent_v1";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

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
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie-Hinweis"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-fade-up"
    >
      <div className="bg-white border border-sage/40 shadow-lg rounded-2xl px-5 py-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 mt-2 rounded-full bg-sage flex-shrink-0" />
          <p className="text-xs sm:text-sm text-warm-text leading-relaxed flex-1">
            Diese Website verwendet ausschließlich technisch notwendige Cookies
            für die Anmeldung. Mehr in unserer{" "}
            <Link
              href="/datenschutz"
              className="text-primary hover:underline font-medium"
            >
              Datenschutzerklärung
            </Link>
            .
          </p>
          <button
            onClick={accept}
            aria-label="Schließen"
            className="text-warm-light hover:text-warm-dark transition flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end">
          <button
            onClick={accept}
            className="text-xs font-medium bg-sage hover:bg-sage/80 text-warm-dark px-5 py-2 rounded-full transition"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
