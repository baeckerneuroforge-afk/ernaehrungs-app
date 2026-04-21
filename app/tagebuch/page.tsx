import { createSupabaseAdmin } from "@/lib/supabase/server";
import { requireOnboardedUser } from "@/lib/auth-guard";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TagebuchClient } from "@/components/tagebuch/tagebuch-client";
import { getUserPlan } from "@/lib/feature-gates-server";
import { hasFeatureAccess } from "@/lib/feature-gates";
import {
  calculateDailyTargets,
  type PlanDayTarget,
} from "@/lib/nutrition-targets";
import type { DayPlan, WeekPlanData } from "@/types/meal-plan";
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
      // Aktiver Plan — wir brauchen die plan_data für den Tages-Lookup, nicht
      // nur ein Flag. Jüngster aktiver Plan gewinnt (es gibt selten mehrere,
      // aber falls ja: der zuletzt erstellte).
      supabase
        .from("ea_meal_plans")
        .select("id, plan_data, created_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const canUsePhoto = hasFeatureAccess(plan, "foto_tracking");
  const canImport = hasFeatureAccess(plan, "csv_import");
  const canSmartLog = hasFeatureAccess(plan, "smart_log");

  const hasActivePlan = !!planRow?.id;

  // Plan → Tages-Ziel-Mapping: Anzahl Tage zwischen Plan-Erstellung und heute
  // bestimmt den Index. Plan-Tage sind 0-basiert im Array, aber 1-basiert für
  // die Anzeige. Wenn der Index außerhalb des Arrays liegt (Plan zu alt oder
  // zu kurz), fallen wir auf calorie_target/TDEE zurück.
  let planDay: PlanDayTarget | null = null;
  if (planRow?.id && planRow.plan_data && planRow.created_at) {
    const planData = planRow.plan_data as WeekPlanData;
    const days = Array.isArray(planData.weekPlan) ? planData.weekPlan : [];
    if (days.length > 0) {
      // Start-Datum: Tag auf 00:00 gesetzt, damit dayIndex nicht durch
      // Uhrzeiten verfälscht wird.
      const start = new Date(planRow.created_at);
      start.setHours(0, 0, 0, 0);
      const todayDate = new Date(today + "T00:00:00");
      const dayIndex = Math.floor(
        (todayDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (dayIndex >= 0 && dayIndex < days.length) {
        const dp: DayPlan = days[dayIndex];
        // Falls der Plan keine pro-Tag-Kalorien speichert, nehmen wir die
        // Summe aus den Mahlzeiten als Approximation. Fehlt auch die:
        // planDay bleibt null → Fallback greift.
        const calFromMeals = dp.meals.reduce(
          (sum, m) => sum + (m.calories || 0),
          0
        );
        const targetCalories =
          dp.targetCalories ||
          (calFromMeals > 0 ? calFromMeals : planData.dailyTarget || 0);
        if (targetCalories > 0) {
          planDay = {
            targetCalories,
            macros: dp.macros,
            dayNumber: dayIndex + 1,
            totalDays: days.length,
          };
        }
      }
    }
  }

  const targets = profileRow
    ? calculateDailyTargets(profileRow, planDay)
    : calculateDailyTargets(
        {
          alter_jahre: null,
          geschlecht: null,
          groesse_cm: null,
          gewicht_kg: null,
          aktivitaet: null,
          ziel: null,
        },
        planDay
      );

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
