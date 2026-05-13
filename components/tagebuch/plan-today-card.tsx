"use client";

import { Sunrise, Sun, Moon, Apple, Plus, Check, ClipboardList, Loader2 } from "lucide-react";
import type { ActivePlanForTagebuch, ActivePlanMeal } from "@/lib/active-plan";
import type { TagebuchMealSlot } from "@/types";

interface Props {
  plan: ActivePlanForTagebuch;
  /** Set von Plan-Mahlzeit-Refs ("dayIndex:mealIndex"), die heute schon eingetragen sind. */
  consumedRefs: Set<string>;
  /** Wird beim Klick auf [+] aufgerufen. Optimistic: callsite aktualisiert consumedRefs. */
  onAdd: (meal: ActivePlanMeal) => void;
  /** Refs, für die gerade ein Eintrag-Call läuft — zeigt Spinner statt [+]. */
  pendingRefs: Set<string>;
  /** Tap auf "Andere Plan-Mahlzeit wählen" — öffnet Picker. */
  onOpenPicker: () => void;
}

const SLOT_ORDER: TagebuchMealSlot[] = ["fruehstueck", "mittag", "snack", "abend"];

const SLOT_META: Record<TagebuchMealSlot, { icon: typeof Sunrise; label: string; iconBg: string; iconColor: string }> = {
  fruehstueck: {
    icon: Sunrise,
    label: "Frühstück",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  mittag: {
    icon: Sun,
    label: "Mittag",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  snack: {
    icon: Apple,
    label: "Snack",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  abend: {
    icon: Moon,
    label: "Abend",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
};

export function PlanTodayCard({ plan, consumedRefs, onAdd, pendingRefs, onOpenPicker }: Props) {
  if (plan.todayDayIndex == null) return null;
  const todayDay = plan.days[plan.todayDayIndex];
  if (!todayDay || todayDay.meals.length === 0) return null;

  // Mahlzeiten nach den 4 Slots gruppieren — wenn der Plan z.B. zwei
  // "Snack"-Mahlzeiten am Tag hat, kommen beide in den Snack-Abschnitt.
  // Render-Reihenfolge: Frühstück → Mittag → Snack → Abend, alles andere
  // wandert in Snack als Default.
  const bySlot: Record<TagebuchMealSlot, ActivePlanMeal[]> = {
    fruehstueck: [],
    mittag: [],
    snack: [],
    abend: [],
  };
  for (const m of todayDay.meals) {
    bySlot[m.slot].push(m);
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border bg-primary-faint/50">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList className="w-4 h-4 text-primary flex-shrink-0" />
          <h3 className="font-serif text-base text-ink truncate">
            Heute aus deinem Plan
          </h3>
        </div>
        <span className="text-[11px] font-medium text-primary bg-white rounded-full px-2 py-0.5 flex-shrink-0">
          Tag {plan.todayDayIndex + 1} / {plan.totalDays}
        </span>
      </div>

      {/* Slots */}
      <div className="divide-y divide-border">
        {SLOT_ORDER.map((slot) => {
          const meals = bySlot[slot];
          if (meals.length === 0) return null;
          const meta = SLOT_META[slot];
          const Icon = meta.icon;
          return (
            <div key={slot} className="px-4 sm:px-5 py-3">
              {meals.map((meal, i) => {
                const consumed = consumedRefs.has(meal.ref);
                const pending = pendingRefs.has(meal.ref);
                return (
                  <div
                    key={meal.ref}
                    className={`flex items-start gap-3 ${i > 0 ? "mt-3" : ""}`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${meta.iconBg}`}>
                      <Icon className={`w-4 h-4 ${meta.iconColor}`} />
                    </span>
                    <div className={`flex-1 min-w-0 ${consumed ? "opacity-50" : ""}`}>
                      <p className="text-[10px] text-ink-faint uppercase tracking-wide">
                        {meta.label}
                      </p>
                      <p className="text-sm font-medium text-ink leading-tight mt-0.5 line-clamp-2">
                        {meal.name || meal.shortDescription || "Mahlzeit"}
                      </p>
                      {meal.calories != null && (
                        <p className="text-[11px] text-ink-faint mt-0.5">
                          {meal.calories} kcal
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => !consumed && !pending && onAdd(meal)}
                      disabled={consumed || pending}
                      aria-label={
                        consumed
                          ? "Bereits eingetragen"
                          : `${meal.name} ins Tagebuch eintragen`
                      }
                      className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition ${
                        consumed
                          ? "bg-emerald-50 text-emerald-600 cursor-default"
                          : pending
                          ? "bg-primary/10 text-primary cursor-wait"
                          : "bg-primary text-white hover:bg-primary-hover active:scale-95"
                      }`}
                    >
                      {consumed ? (
                        <Check className="w-5 h-5" />
                      ) : pending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Picker-CTA */}
      <button
        type="button"
        onClick={onOpenPicker}
        className="w-full px-4 sm:px-5 py-3 text-sm text-primary hover:bg-primary-faint/50 transition border-t border-border flex items-center justify-between"
      >
        <span>Andere Plan-Mahlzeit wählen</span>
        <span aria-hidden>→</span>
      </button>
    </div>
  );
}
