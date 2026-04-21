import { createSupabaseAdmin } from "@/lib/supabase/server";
import { requireOnboardedUser } from "@/lib/auth-guard";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TagebuchClient } from "@/components/tagebuch/tagebuch-client";
import { getUserPlan } from "@/lib/feature-gates-server";
import { hasFeatureAccess } from "@/lib/feature-gates";
import { calculateDailyTargets } from "@/lib/nutrition-targets";
import { Upload } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TagebuchPage() {
  const userId = await requireOnboardedUser();

  const supabase = createSupabaseAdmin();

  const today = new Date().toISOString().split("T")[0];

  const [{ data: entries }, plan, { data: profileRow }, { data: planRow }] =
    await Promise.all([
      supabase
        .from("ea_food_log")
        .select("*")
        .eq("user_id", userId)
        .eq("datum", today)
        .order("created_at", { ascending: true }),
      getUserPlan(userId),
      // Profile-Felder für TDEE + calorie_target
      supabase
        .from("ea_profiles")
        .select(
          "alter_jahre, geschlecht, groesse_cm, gewicht_kg, aktivitaet, ziel, calorie_target, calorie_adjustment"
        )
        .eq("user_id", userId)
        .maybeSingle(),
      // Aktiver Plan-Check: ein einziger Row reicht als Flag
      supabase
        .from("ea_meal_plans")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle(),
    ]);

  const canUsePhoto = hasFeatureAccess(plan, "foto_tracking");
  const canImport = hasFeatureAccess(plan, "csv_import");
  const canSmartLog = hasFeatureAccess(plan, "smart_log");

  const targets = profileRow ? calculateDailyTargets(profileRow) : null;
  const hasActivePlan = !!planRow?.id;

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-800">
            Ernährungstagebuch
          </h1>
          {canImport && (
            <Link
              href="/einstellungen/import"
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover transition flex-shrink-0 mt-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              CSV Import
            </Link>
          )}
        </div>
        <p className="text-gray-500 text-sm mb-8">
          Halte fest, was du isst – für einen besseren Überblick.
        </p>
        <TagebuchClient
          initialEntries={entries || []}
          today={today}
          canUsePhoto={canUsePhoto}
          canSmartLog={canSmartLog}
          targets={targets}
          hasActivePlan={hasActivePlan}
        />
      </main>
      <Footer />
    </div>
  );
}
