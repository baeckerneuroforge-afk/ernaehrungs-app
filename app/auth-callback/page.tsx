"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, Suspense } from "react";
import { Leaf, Loader2 } from "lucide-react";

/**
 * Post-sign-in landing.  Two hard jobs it has to get right:
 *
 *  1. Clerk sometimes finishes `setActive()` on the client before the HttpOnly
 *     session cookie has fully propagated to our server.  A client-only
 *     `router.replace()` would race the middleware and bounce the user back
 *     to /sign-in.  We instead poll GET /api/auth/check until it returns 200,
 *     which proves the cookie is reaching the server, then hard-navigate.
 *
 *  2. Returning users who signed up via social on /sign-up still carry
 *     `?next=/onboarding`.  The server check tells us whether they still
 *     need it (`needsOnboarding`) and we trust that over any URL param.
 */

const MAX_POLL_ATTEMPTS = 20; // 20 * 400ms = 8s grace window
const POLL_INTERVAL_MS = 400;

function AuthCallbackContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const navigating = useRef(false);

  useEffect(() => {
    if (!isLoaded || navigating.current) return;

    // Not signed in at all? Give Clerk the same 8s grace window (email+code
    // can take a moment), then fall back to /sign-in.
    if (!isSignedIn) {
      const timer = setTimeout(() => {
        if (!navigating.current) {
          navigating.current = true;
          router.replace("/sign-in");
        }
      }, 8000);
      return () => clearTimeout(timer);
    }

    // Signed in per Clerk client state — now confirm the cookie is reaching
    // our server and decide destination based on onboarding completion.
    navigating.current = true;
    let cancelled = false;

    const go = (url: string) => {
      if (cancelled) return;
      if (typeof window !== "undefined") {
        window.location.replace(url);
      } else {
        router.replace(url);
      }
    };

    const nextParam = searchParams.get("next");

    const poll = async (attempt: number): Promise<void> => {
      if (cancelled) return;
      try {
        const res = await fetch("/api/auth/check", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (res.status === 401) {
          // Cookie not through yet — retry with a small backoff.
          if (attempt < MAX_POLL_ATTEMPTS) {
            setTimeout(() => void poll(attempt + 1), POLL_INTERVAL_MS);
          } else {
            go("/sign-in");
          }
          return;
        }

        if (!res.ok) {
          if (attempt < MAX_POLL_ATTEMPTS) {
            setTimeout(() => void poll(attempt + 1), POLL_INTERVAL_MS);
          } else {
            // Server confirmed there's nothing we can do — send them to
            // onboarding and let that page's own retry mechanism kick in.
            go("/onboarding");
          }
          return;
        }

        const data = (await res.json()) as { needsOnboarding: boolean };

        // needsOnboarding wins over `?next` — if the server says the user
        // hasn't completed onboarding, nothing else matters.
        if (data.needsOnboarding) {
          go("/onboarding");
          return;
        }

        // Onboarded. Respect `?next` if it's safe (same-origin path), else /home.
        const safeNext =
          nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
            ? nextParam
            : null;
        go(safeNext && safeNext !== "/onboarding" ? safeNext : "/home");
      } catch {
        if (attempt < MAX_POLL_ATTEMPTS) {
          setTimeout(() => void poll(attempt + 1), POLL_INTERVAL_MS);
        } else {
          go("/sign-in");
        }
      }
    };

    void poll(0);

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router, searchParams]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-surface-bg px-6">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/25">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-[#292524] border border-border flex items-center justify-center shadow">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-serif text-xl text-warm-dark mb-1">
            Dein Bereich wird geladen…
          </p>
          <p className="text-sm text-warm-muted">Einen kleinen Moment.</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-surface-bg">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/25">
            <Leaf className="w-7 h-7 text-white" />
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
