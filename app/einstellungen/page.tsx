import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SettingsClient } from "@/components/settings/settings-client";

export const metadata = {
  title: "Einstellungen – Ernährungsberatung",
  description: "Benachrichtigungen, Darstellung und Konto-Einstellungen.",
};

export const dynamic = "force-dynamic";

type Theme = "light" | "dark" | "system";

interface NotificationPreferences {
  tagebuch_reminder: { enabled: boolean; time: string };
  review_reminder: { enabled: boolean };
  credit_warning_email: { enabled: boolean };
}

const DEFAULT_PREFS: NotificationPreferences = {
  tagebuch_reminder: { enabled: false, time: "20:00" },
  review_reminder: { enabled: false },
  credit_warning_email: { enabled: true },
};

export default async function EinstellungenPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ea_users")
    .select("notification_preferences, theme")
    .eq("clerk_id", userId)
    .limit(1);

  const row = data?.[0];
  const initialPreferences =
    (row?.notification_preferences as NotificationPreferences) ?? DEFAULT_PREFS;
  const initialTheme = (row?.theme as Theme) ?? "system";

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-ink">Einstellungen</h1>
          <p className="text-ink-muted mt-1 text-sm">
            Passe deine App an — Benachrichtigungen, Darstellung und mehr.
          </p>
        </div>

        <SettingsClient
          initialPreferences={initialPreferences}
          initialTheme={initialTheme}
        />
      </main>
      <Footer />
    </div>
  );
}
