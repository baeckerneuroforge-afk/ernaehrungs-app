import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SupportForm } from "@/components/support/support-form";
import { SupportFaq } from "@/components/support/support-faq";
import { Mail, Clock } from "lucide-react";

export const metadata = {
  title: "Support – Ernährungsberatung",
  description: "Hilfe, Kontakt und häufige Fragen rund um die App.",
};

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const { userId } = await auth();

  // Prefill name/email for logged-in users
  let prefillName = "";
  let prefillEmail = "";
  if (userId) {
    const user = await currentUser();
    prefillEmail = user?.emailAddresses?.[0]?.emailAddress || "";
    const supabase = createSupabaseAdmin();
    const { data } = await supabase
      .from("ea_profiles")
      .select("name")
      .eq("user_id", userId)
      .limit(1);
    prefillName = data?.[0]?.name || user?.firstName || "";
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-serif text-3xl sm:text-4xl text-ink">
            Hilfe &amp; Support
          </h1>
          <p className="text-ink-muted mt-2">Wir helfen dir gerne weiter.</p>
        </div>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="font-serif text-xl text-ink mb-4">Häufige Fragen</h2>
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <SupportFaq />
          </div>
        </section>

        {/* Contact form */}
        <section className="mb-10">
          <h2 className="font-serif text-xl text-ink mb-4">Dein Anliegen</h2>
          <div className="bg-white rounded-2xl border border-border p-5 sm:p-6">
            <SupportForm prefillName={prefillName} prefillEmail={prefillEmail} />
          </div>
        </section>

        {/* Direct contact */}
        <section className="bg-primary-faint rounded-2xl border border-primary-pale p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-ink">
                Oder schreib uns direkt:{" "}
                <a
                  href="mailto:kontakt@nutriva-ai.de"
                  className="font-medium text-primary hover:text-primary-hover"
                >
                  kontakt@nutriva-ai.de
                </a>
              </p>
              <p className="flex items-center gap-1.5 text-xs text-ink-muted mt-1">
                <Clock className="w-3 h-3" />
                Antwortzeit: in der Regel innerhalb von 24 Stunden
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
