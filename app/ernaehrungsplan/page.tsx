"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PlanCreator } from "@/components/meal-plan/plan-creator";
import { WeekGrid } from "@/components/meal-plan/week-grid";
import { UpgradeCard } from "@/components/upgrade-card";
import type { WeekPlanData, PlanParameters } from "@/types/meal-plan";
import {
  UtensilsCrossed,
  Plus,
  Loader2,
  FileText,
  Trash2,
  ArrowLeft,
  CalendarDays,
} from "lucide-react";

interface SavedPlan {
  id: string;
  titel: string;
  zeitraum: string | null;
  created_at: string;
  plan_data: WeekPlanData | null;
  parameters: PlanParameters | null;
  status: string;
}

export default function ErnaehrungsplanPage() {
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [calorieTarget, setCalorieTarget] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUserPlan(data?.plan || "free"))
      .catch(() => setUserPlan("free"));
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.calorie_target) setCalorieTarget(data.calorie_target); })
      .catch(() => {});
  }, []);

  // Active plan view
  const [activePlan, setActivePlan] = useState<{
    data: WeekPlanData;
    params: PlanParameters;
    id?: string;
    titel?: string;
  } | null>(null);

  const loadPlans = useCallback(async () => {
    const res = await fetch("/api/ernaehrungsplan");
    if (res.ok) {
      const data = await res.json();
      setPlans(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  function handlePlanGenerated(data: WeekPlanData, params: PlanParameters) {
    setActivePlan({ data, params });
    setShowCreator(false);

    // Save plan
    fetch("/api/ernaehrungsplan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planData: data, parameters: params }),
    })
      .then((r) => r.json())
      .then((saved) => {
        if (saved.id) {
          setActivePlan((prev) => prev ? { ...prev, id: saved.id, titel: saved.titel } : prev);
          loadPlans();
        }
      })
      .catch(console.error);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/ernaehrungsplan/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (activePlan?.id === id) setActivePlan(null);
    loadPlans();
  }

  async function handleLoadPlan(plan: SavedPlan) {
    if (plan.plan_data && plan.parameters) {
      setActivePlan({
        data: plan.plan_data,
        params: plan.parameters,
        id: plan.id,
        titel: plan.titel,
      });
      setShowCreator(false);
    } else {
      // Legacy plan without structured data — load detail page
      window.location.href = `/ernaehrungsplan/${plan.id}`;
    }
  }

  // Show active plan view
  if (activePlan) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-bg">
        <Navbar />
        <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6 w-full">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setActivePlan(null)}
              className="flex items-center gap-1.5 text-sm text-warm-muted hover:text-primary transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </button>
            <h2 className="text-sm font-medium text-warm-dark">
              {activePlan.titel || "Aktueller Plan"}
            </h2>
          </div>
          <WeekGrid data={activePlan.data} params={activePlan.params} userPlan={userPlan || "pro"} />
        </main>
        <Footer />
      </div>
    );
  }

  // Free users: show upgrade card instead of the creator
  if (userPlan === "free") {
    return (
      <div className="min-h-screen flex flex-col bg-surface-bg">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 w-full">
          <div className="mb-6">
            <h1 className="font-serif text-3xl text-ink">Ernährungsplan</h1>
            <p className="text-ink-muted text-sm mt-1">
              Personalisierte 7-Tage-Pläne, abgestimmt auf dein Profil.
            </p>
          </div>
          <UpgradeCard
            icon={CalendarDays}
            title="Personalisierte Ernährungspläne"
            description="Erstelle 7-Tage-Pläne mit Fastenmodell, Mealprep und individuellen Wünschen — abgestimmt auf dein Profil und deine Ziele."
            features={[
              "7-Tage-Wochenplan mit Rezepten und Nährwerten",
              "Intervallfasten, Mealprep und flexible Mahlzeitenzeiten",
              "Automatische Einkaufsliste und Mealprep-Anleitung",
            ]}
            ctaLabel="Ab €15,99/Monat — Basis wählen"
            ctaHref="/#pricing"
            requiredPlan="pro"
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-warm-dark">
              Ernährungsplan
            </h1>
            <p className="text-warm-muted text-sm mt-1">
              Individueller 7-Tage-Plan basierend auf deinem Profil.
            </p>
          </div>
          {!showCreator && (
            <button
              onClick={() => setShowCreator(true)}
              className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-primary-light transition"
            >
              <Plus className="w-4 h-4" />
              Neuer Plan
            </button>
          )}
        </div>

        {/* Creator */}
        {showCreator && (
          <div className="mb-6">
            <PlanCreator onPlanGenerated={handlePlanGenerated} userPlan={userPlan || "pro"} calorieTarget={calorieTarget} />
            <button
              onClick={() => setShowCreator(false)}
              className="mt-2 text-xs text-warm-light hover:text-warm-muted transition"
            >
              Abbrechen
            </button>
          </div>
        )}

        {/* Saved Plans */}
        <div className="bg-white rounded-2xl border border-warm-border p-5">
          <h3 className="font-semibold text-warm-dark text-sm mb-4">
            Gespeicherte Pläne ({plans.length})
          </h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-warm-light" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-warm-light">
              <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 text-warm-border" />
              <p className="text-sm">Noch keine Pläne erstellt.</p>
              <p className="text-xs mt-1">
                Erstelle deinen ersten Ernährungsplan.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between px-4 py-3 bg-surface-muted rounded-xl"
                >
                  <button
                    onClick={() => handleLoadPlan(plan)}
                    className="flex items-center gap-3 flex-1 text-left hover:text-primary transition"
                  >
                    <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-warm-text">
                        {plan.titel}
                      </p>
                      <p className="text-xs text-warm-light">
                        {plan.status === "active" && (
                          <span className="text-primary font-medium mr-1">Aktiv</span>
                        )}
                        {new Date(plan.created_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    disabled={deleting === plan.id}
                    className="text-warm-light hover:text-red-500 transition p-1"
                  >
                    {deleting === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
