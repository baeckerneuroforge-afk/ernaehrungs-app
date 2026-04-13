"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasRedirected = useRef(false);

  // Once Clerk reports a valid session, do a hard navigation to
  // /onboarding. window.location.href forces a full browser request so
  // the freshly-set __session cookie is guaranteed to travel with it —
  // which Clerk's own fallbackRedirectUrl (client-side navigation) can
  // race with on the email+verification-code flow.
  useEffect(() => {
    if (isLoaded && isSignedIn && !hasRedirected.current) {
      hasRedirected.current = true;
      window.location.href = "/onboarding";
    }
  }, [isLoaded, isSignedIn]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <SignUp
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
          signInUrl="/sign-in"
        />
      </main>
      <Footer />
    </div>
  );
}
