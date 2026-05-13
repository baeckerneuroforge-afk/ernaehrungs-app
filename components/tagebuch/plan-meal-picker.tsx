"use client";

import { useEffect } from "react";
import { X, Plus, Check, Loader2, Sunrise, Sun, Moon, Apple } from "lucide-react";
import type { ActivePlanForTagebuch, ActivePlanMeal } from "@/lib/active-plan";
import { formatMealStats } from "@/lib/active-plan";
import type { TagebuchMealSlot } from "@/types";

interface Props {
  plan: ActivePlanForTagebuch;
  consumedRefs: Set<string>;
  pendingRefs: Set<string>;
  onAdd: (meal: ActivePlanMeal) => void;
  onClose: () => void;
}

const SLOT_ICON: Record<TagebuchMealSlot, typeof Sunrise> = {
  fruehstueck: Sunrise,
  mittag: Sun,
  snack: Apple,
  abend: Moon,
};

const SLOT_LABEL: Record<TagebuchMealSlot, string> = {
  fruehstueck: "Frühstück",
  mittag: "Mittag",
  snack: "Snack",
  abend: "Abend",
};

export function PlanMealPicker({ plan, consumedRefs, pendingRefs, onAdd, onClose }: Props) {
  // ESC schließt den Picker.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-ink/40 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      {/* Mobile: bottom-sheet (max ~85vh). Desktop: zentriertes Modal. */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-card animate-slide-in-up max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-serif text-xl text-ink">
              Aus deinem Plan wählen
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Wird ins heutige Tagebuch übernommen
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition p-1"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {plan.days.map((day) => {
            const isToday = plan.todayDayIndex === day.dayIndex;
            return (
              <section key={day.dayIndex} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-ink">
                    Tag {day.dayIndex + 1}
                    {day.label && (
                      <span className="text-ink-muted font-normal">
                        {" "}· {day.label}
                      </span>
                    )}
                  </h3>
                  {isToday && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-primary bg-primary-pale rounded-full px-2 py-0.5">
                      Heute
                    </span>
                  )}
                </div>
                <div
                  className={`rounded-2xl ${
                    isToday
                      ? "bg-primary-faint/40 border border-primary/20"
                      : "bg-surface-muted/50 border border-border"
                  }`}
                >
                  {day.meals.length === 0 ? (
                    <p className="text-xs text-ink-faint italic px-4 py-3">
                      Keine Mahlzeiten für diesen Tag
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {day.meals.map((meal) => {
                        const Icon = SLOT_ICON[meal.slot];
                        const consumed = consumedRefs.has(meal.ref);
                        const pending = pendingRefs.has(meal.ref);
                        return (
                          <li key={meal.ref} className="flex items-start gap-3 px-3 py-2.5">
                            <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center flex-shrink-0 border border-border">
                              <Icon className="w-3.5 h-3.5 text-ink-muted" />
                            </span>
                            <div className={`flex-1 min-w-0 ${consumed ? "opacity-50" : ""}`}>
                              <p className="text-[10px] text-ink-faint uppercase tracking-wide">
                                {SLOT_LABEL[meal.slot]}
                                {meal.time && (
                                  <span className="ml-1 text-ink-faint">· {meal.time}</span>
                                )}
                              </p>
                              <p className="text-sm font-medium text-ink leading-tight line-clamp-2">
                                {meal.name || meal.shortDescription || "Mahlzeit"}
                              </p>
                              {(() => {
                                const parts = formatMealStats(meal);
                                return parts ? (
                                  <p className="text-[11px] text-ink-faint mt-0.5">{parts}</p>
                                ) : null;
                              })()}
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
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
