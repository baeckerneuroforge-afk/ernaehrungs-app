"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasRedirected = useRef(false);

  // Same pattern as sign-up: once Clerk reports a valid session, do a
  // hard navigation so the browser ships the new __session cookie with
  // the next request. /auth-callback then decides whether to send the
  // user to /chat or /onboarding.
  useEffect(() => {
    if (isLoaded && isSignedIn && !hasRedirected.current) {
      hasRedirected.current = true;
      window.location.href = "/auth-callback";
    }
  }, [isLoaded, isSignedIn]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "rounded-2xl shadow-sm border border-gray-100",
              headerTitle: "text-xl font-bold text-gray-800",
              headerSubtitle: "text-sm text-gray-500",
              socialButtonsBlockButton:
                "rounded-xl border-gray-200 hover:border-primary/30",
              formButtonPrimary:
                "bg-primary hover:bg-primary-light rounded-xl text-sm font-medium",
              formFieldInput:
                "rounded-xl border-gray-200 focus:ring-primary/20 focus:border-primary",
              footerActionLink: "text-primary hover:text-primary-light",
            },
          }}
          signUpUrl="/sign-up"
        />
      </main>
      <Footer />
    </div>
  );
}
