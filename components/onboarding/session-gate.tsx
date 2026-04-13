"use client";

import { useEffect, useState } from "react";
import { Leaf, Loader2 } from "lucide-react";

/**
 * Rendered by /onboarding when the server-side `auth()` call returns no
 * userId. That usually means the Clerk session cookie isn't yet fully
 * propagated after a fresh email+code sign-up. We poll /api/profile for a
 * few seconds; once the API stops returning 401/403 we hard-reload so the
 * server component re-runs with the new cookie. After the grace period we
 * fall back to /sign-in.
 */
export function OnboardingSessionGate() {
  const [message, setMessage] = useState("Dein Profil wird vorbereitet…");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 5;

    const tick = async () => {
      try {
        const res = await fetch("/api/profile", {
          credentials: "same-origin",
        });
        if (!cancelled && res.status !== 401 && res.status !== 403) {
          // Session is reachable — hard-reload so the server component
          // picks up the cookie.
          window.location.reload();
          return;
        }
      } catch {
        // transient — fall through to retry
      }
      attempts++;
      if (cancelled) return;
      if (attempts < maxAttempts) {
        setTimeout(tick, 1000);
      } else {
        setMessage("Sitzung konnte nicht geladen werden. Wird neu geladen…");
        // Last-ditch full reload — gives the cookie one final chance.
        setTimeout(() => {
          if (!cancelled) window.location.reload();
        }, 500);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/25">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          </div>
        </div>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}
