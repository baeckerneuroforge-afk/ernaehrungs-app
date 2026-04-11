"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function AuthCallbackContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [waited, setWaited] = useState(false);

  // Timeout: wenn nach 3s immer noch nicht signed in, dann zu /sign-in
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      const next = searchParams.get("next") || "/chat";
      router.replace(next);
      return;
    }

    // Erst nach 3s Wartezeit auf /sign-in redirecten
    // Vorher könnte der Cookie noch propagieren
    if (waited && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, waited, router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">Einen Moment bitte...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
