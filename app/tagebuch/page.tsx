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
import type { WeekPlanData } from "@/types/meal-plan";
import { buildActivePlanForTagebuch } from "@/lib/active-plan";
import { todayLocal } from "@/lib/local-date";
import { Upload } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TagebuchPage() {
  const userId = await requireOnboardedUser();

  const supabase = createSupabaseAdmin();

  const today = todayLocal();

  const [{ data: entries }, plan, { data: profileRow }, { data: planRow }] =
    await Promise.all([
      supabase
        .from("ea_food_log")
        .select("*")
        .eq("user_id", userId)
        .eq("datum", today)
        .order("created_at", { ascending: true }),
      getUserPlan(userId),
      supabase
        .from("ea_profiles")
        .select(
          "alter_jahre, geschlecht, groesse_cm, gewicht_kg, aktivitaet, ziel, calorie_target, calorie_adjustment"
        )
        .eq("user_id", userId)
        .maybeSingle(),
      // Aktiver Plan — jüngster gewinnt falls mehrere.
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
  const canUsePlan = hasFeatureAccess(plan, "plan");

  // Aktiven Plan zu einem Tagebuch-tauglichen Objekt verdichten — gibt
  // alle Tage + heutige-Tag-Index + bereits gemappte Slots zurück. null
  // wenn Plan leer/kaputt oder garnicht vorhanden.
  const activePlan =
    planRow?.id && canUsePlan
      ? buildActivePlanForTagebuch(
          planRow.id,
          planRow.plan_data as WeekPlanData | null,
          planRow.created_at,
          today
        )
      : null;

  // Tages-Kalorienziel aus dem Plan ableiten — nur wenn Plan heute aktiv.
  let planDay: PlanDayTarget | null = null;
  if (activePlan && activePlan.todayDayIndex != null) {
    const todayDay = activePlan.days[activePlan.todayDayIndex];
    const planData = planRow!.plan_data as WeekPlanData;
    const dailyTarget = planData?.dailyTarget;
    const calFromMeals = todayDay.meals.reduce(
      (sum, m) => sum + (m.calories || 0),
      0
    );
    // Plan-Tag-Wert aus dem rohen plan_data ziehen (targetCalories ist
    // dort noch verfügbar, in der verdichteten Form nicht — daher
    // direkter Zugriff hier).
    const rawDay = planData?.weekPlan?.[activePlan.todayDayIndex];
    const targetCalories =
      rawDay?.targetCalories ||
      (calFromMeals > 0 ? calFromMeals : dailyTarget || 0);
    if (targetCalories > 0) {
      planDay = {
        targetCalories,
        dayNumber: activePlan.todayDayIndex + 1,
        totalDays: activePlan.totalDays,
      };
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
          hasActivePlan={!!planRow?.id}
          activePlan={activePlan}
        />
      </main>
      <Footer />
    </div>
  );
}
