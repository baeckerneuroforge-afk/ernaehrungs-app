import { SignUp } from "@clerk/nextjs";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function SignUpPage() {
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
          fallbackRedirectUrl="/onboarding"
          signInUrl="/sign-in"
          signInFallbackRedirectUrl="/auth-callback"
        />
      </main>
      <Footer />
    </div>
  );
}
