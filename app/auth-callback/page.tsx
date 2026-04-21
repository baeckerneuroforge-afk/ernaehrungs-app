"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, Suspense } from "react";
import { Leaf, Loader2 } from "lucide-react";

/**
 * Post-sign-in landing.
 *
 * Old version: polled /api/auth/check at a flat 400ms for up to 20 attempts
 * (~8s best-case wait). User feedback: frequent 10–20s spinners forced people
 * to reload manually.
 *
 * New version:
 *   1. Use Clerk's client SDK (`isSignedIn`, `getToken`) as the primary
 *      signal. `isSignedIn` flips reactively the instant the cookie lands
 *      in the browser — way before the round-trip to our server finishes.
 *      `getToken()` resolves only after Clerk's SDK has fully synced its
 *      session, which is the same moment our server will see the cookie.
 *   2. Once that's done, fire ONE /api/auth/check to decide onboarding
 *      vs. home. Retry that single check with a short adaptive backoff if
 *      the server is briefly behind the client.
 *
 * Result: ~100–300ms in the happy path, worst case ~5s instead of 8s.
 */

// Adaptive intervals: fast first, then back off. Sum ≈ 5.2s across 15 tries.
const POLL_INTERVALS = [
  100, 100, 100, 300, 300, 300, 300, 400, 400, 400, 500, 500, 500, 500, 500,
];

function AuthCallbackContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const navigating = useRef(false);

  useEffect(() => {
    if (!isLoaded || navigating.current) return;

    // Clerk says we're not signed in. Give the client SDK a 2s grace window
    // (email+code flow can take a moment to finalize setActive()), then
    // bail to /sign-in. Used to be 8s — the poll path has been removed so
    // there's no point waiting that long here.
    if (!isSignedIn) {
      const timer = setTimeout(() => {
        if (!navigating.current) {
          navigating.current = true;
          if (typeof window !== "undefined") {
            window.location.replace("/sign-in");
          } else {
            router.replace("/sign-in");
          }
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

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
    const safeNext =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : null;
    const destinationIfOnboarded =
      safeNext && safeNext !== "/onboarding" ? safeNext : "/home";

    const run = async () => {
      // Wait for Clerk's SDK to hand us a session token. This is the
      // strongest signal that the session cookie has fully propagated.
      // If it throws or times out we still try the server — getToken()
      // can occasionally reject even when the cookie is ok.
      try {
        await getToken();
      } catch (err) {
        console.warn("[auth-callback] getToken failed, continuing anyway:", err);
      }

      const check = async (attempt: number): Promise<void> => {
        if (cancelled) return;
        try {
          const res = await fetch("/api/auth/check", {
            credentials: "same-origin",
            cache: "no-store",
          });

          if (!res.ok) {
            if (attempt < POLL_INTERVALS.length) {
              setTimeout(() => void check(attempt + 1), POLL_INTERVALS[attempt]);
            } else {
              go("/sign-in");
            }
            return;
          }

          const data = (await res.json()) as {
            signedIn: boolean;
            needsOnboarding: boolean;
          };

          // Server briefly behind the client — retry quickly.
          if (!data.signedIn) {
            if (attempt < POLL_INTERVALS.length) {
              setTimeout(() => void check(attempt + 1), POLL_INTERVALS[attempt]);
            } else {
              go("/sign-in");
            }
            return;
          }

          if (data.needsOnboarding) {
            go("/onboarding");
            return;
          }
          go(destinationIfOnboarded);
        } catch (err) {
          console.error("[auth-callback] check error:", err);
          if (attempt < POLL_INTERVALS.length) {
            setTimeout(() => void check(attempt + 1), POLL_INTERVALS[attempt]);
          } else {
            go("/sign-in");
          }
        }
      };

      void check(0);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, router, searchParams]);

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
