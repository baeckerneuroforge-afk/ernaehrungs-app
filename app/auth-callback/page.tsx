"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Leaf, Loader2 } from "lucide-react";

/**
 * Post-sign-in bounce page.
 *
 * Purpose: Clerk's auth state becomes available on the client instantly,
 * but Next.js Server Components still hold the old (unauthenticated)
 * cache. Landing directly on /chat after sign-in shows stale navbar and
 * empty data until manual reload.
 *
 * This page waits for Clerk's user to be loaded, then performs a
 * router.refresh() to invalidate the Server Components cache BEFORE
 * pushing to /chat, guaranteeing a fresh server render.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    // Invalidate server cache, then navigate.
    router.refresh();
    // Small delay so refresh() has a tick to propagate before the push.
    const t = setTimeout(() => router.replace("/chat"), 50);
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn, router]);

  // Safety net: if Clerk never loads within 5s, bail back to sign-in.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!isLoaded) router.replace("/sign-in");
    }, 5000);
    return () => clearTimeout(t);
  }, [isLoaded, router]);

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
