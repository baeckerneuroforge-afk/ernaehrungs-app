"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import { Leaf, Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [waited, setWaited] = useState(false);
  const navigating = useRef(false);

  // Safety timeout: if still not signed in after 3s, bail to /sign-in
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded || navigating.current) return;

    if (isSignedIn) {
      navigating.current = true;
      const next = searchParams.get("next");

      // If targeting /onboarding, check whether the user already completed
      // it.  Returning users who sign in via Google on the /sign-up page
      // still carry ?next=/onboarding — without this check they'd be
      // forced back through onboarding.
      if (next === "/onboarding") {
        fetch("/api/profile", { credentials: "same-origin" })
          .then((r) => (r.ok ? r.json() : null))
          .then((profile) => {
            router.refresh();
            if (profile?.onboarding_done) {
              router.replace("/chat");
            } else {
              router.replace("/onboarding");
            }
          })
          .catch(() => {
            router.refresh();
            router.replace("/onboarding");
          });
        return;
      }

      // Normal post-sign-in flow: go straight to the requested page
      router.refresh();
      router.replace(next || "/chat");
      return;
    }

    // Only redirect to /sign-in after the 3s grace period
    if (waited && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, waited, router, searchParams]);

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
