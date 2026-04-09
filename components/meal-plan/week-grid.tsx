"use client";

import { useState } from "react";
import type { WeekPlanData, Meal, PlanParameters } from "@/types/meal-plan";
import { MealDetail } from "./meal-detail";
import { ShoppingList } from "./shopping-list";
import { MealprepPlan } from "./mealprep-plan";
import {
  ChevronDown,
  ShoppingCart,
  ChefHat,
  MessageCircle,
  Sunrise,
  Sun,
  Moon,
  Utensils,
  Flame,
} from "lucide-react";
import Link from "next/link";

interface Props {
  data: WeekPlanData;
  params: PlanParameters;
}

const DAYS_ORDER = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

type MealVisual = {
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  text: string;
};

function getMealVisual(type: string): MealVisual {
  const lower = type.toLowerCase();
  if (lower.includes("frühstück") || lower.includes("fruehstueck") || lower.includes("breakfast")) {
    return { icon: Sunrise, bg: "bg-orange-100", text: "text-orange-600" };
  }
  if (lower.includes("mittag") || lower.includes("lunch")) {
    return { icon: Sun, bg: "bg-yellow-100", text: "text-yellow-600" };
  }
  if (lower.includes("abend") || lower.includes("dinner")) {
    return { icon: Moon, bg: "bg-indigo-100", text: "text-indigo-600" };
  }
  return { icon: Utensils, bg: "bg-primary-pale", text: "text-primary" };
}

function isToday(dayName: string): boolean {
  const today = new Date().getDay(); // 0=Sun .. 6=Sat
  const map: Record<string, number> = {
    Sonntag: 0,
    Montag: 1,
    Dienstag: 2,
    Mittwoch: 3,
    Donnerstag: 4,
    Freitag: 5,
    Samstag: 6,
  };
  return map[dayName] === today;
}

export function WeekGrid({ data, params }: Props) {
  const [selectedMeal, setSelectedMeal] = useState<{ meal: Meal; day: string } | null>(null);
  const [showShopping, setShowShopping] = useState(false);
  const [showMealprep, setShowMealprep] = useState(false);

  // Sort days Mo-So for consistency
  const days = [...data.weekPlan].sort((a, b) => {
    const ai = DAYS_ORDER.indexOf(a.day);
    const bi = DAYS_ORDER.indexOf(b.day);
    if (ai === -1 || bi === -1) return 0;
    return ai - bi;
  });

  const chatChips = buildChatChips(data);

  return (
    <div className="animate-fade-in">
      {/* Meal Detail Modal */}
      {selectedMeal && (
        <MealDetail
          meal={selectedMeal.meal}
          day={selectedMeal.day}
          onClose={() => setSelectedMeal(null)}
        />
      )}

      {/* Daily target banner */}
      {data.dailyTarget && (
        <div className="mb-4 flex items-center gap-3 bg-primary-faint border border-primary-pale rounded-2xl px-4 py-3">
          <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center flex-shrink-0">
            <Flame className="w-4 h-4 text-primary" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">
              Tägliches Kalorienziel: {data.dailyTarget} kcal
            </p>
            {data.calculationBasis && (
              <p className="text-xs text-ink-muted mt-0.5 truncate">
                {data.calculationBasis}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Week day cards — grid on md+, stacked on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {days.map((day, idx) => {
          const today = isToday(day.day);
          return (
            <div
              key={day.day}
              style={{ animationDelay: `${idx * 40}ms` }}
              className={`rounded-2xl border p-4 transition-all duration-200 animate-slide-in-up ${
                today
                  ? "bg-primary-pale border-primary shadow-card"
                  : "bg-white border-border hover:-translate-y-0.5 hover:shadow-md shadow-card"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-lg font-semibold text-ink">{day.day}</h3>
                {today && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-white rounded-full px-2 py-0.5">
                    Heute
                  </span>
                )}
              </div>

              {(() => {
                const target = day.targetCalories ?? data.dailyTarget;
                const actual =
                  day.actualCalories ??
                  day.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
                if (!actual || !target) return null;
                const diff = Math.abs(actual - target);
                const cls =
                  diff <= 100
                    ? "text-primary bg-primary-pale"
                    : diff <= 200
                    ? "text-yellow-700 bg-yellow-50"
                    : "text-red-600 bg-red-50";
                return (
                  <div
                    className={`mb-2 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}
                    title={`Ziel: ${target} kcal`}
                  >
                    <Flame className="w-3 h-3" />Σ {actual} kcal
                  </div>
                );
              })()}

              <div className="space-y-2">
                {day.meals.map((meal, mIdx) => {
                  const visual = getMealVisual(meal.type);
                  const Icon = visual.icon;
                  return (
                    <button
                      key={mIdx}
                      onClick={() => setSelectedMeal({ meal, day: day.day })}
                      className="w-full flex items-start gap-3 rounded-xl border border-border bg-white p-2.5 text-left hover:border-primary/40 hover:bg-primary-faint transition-all duration-200 group"
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${visual.bg}`}>
                        <Icon className={`w-4 h-4 ${visual.text}`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-ink-faint uppercase tracking-wide">
                          {meal.type} · {meal.time}
                        </p>
                        <p className="text-sm font-medium text-ink group-hover:text-primary transition leading-tight mt-0.5 line-clamp-2">
                          {meal.name}
                        </p>
                        {meal.calories && (
                          <p className="text-[11px] text-ink-faint mt-0.5">~{meal.calories} kcal</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expandable sections */}
      <div className="mt-6 space-y-3">
        {/* Shopping List */}
        <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden transition-all duration-200">
          <button
            onClick={() => setShowShopping(!showShopping)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-primary-faint transition-colors"
          >
            <span className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-primary" />
              </span>
              <span className="text-sm font-semibold text-ink">Einkaufsliste</span>
              <span className="text-xs text-ink-faint">{data.shoppingList.length} Zutaten</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-ink-faint transition-transform duration-200 ${
                showShopping ? "rotate-180" : ""
              }`}
            />
          </button>
          {showShopping && (
            <div className="px-5 pb-5 border-t border-border pt-4 animate-fade-in">
              <ShoppingList items={data.shoppingList} />
            </div>
          )}
        </div>

        {/* Mealprep */}
        {params.mealprep && data.mealPrepPlan && (
          <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden transition-all duration-200">
            <button
              onClick={() => setShowMealprep(!showMealprep)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-primary-faint transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center">
                  <ChefHat className="w-4 h-4 text-primary" />
                </span>
                <span className="text-sm font-semibold text-ink">Mealprep-Plan</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-ink-faint transition-transform duration-200 ${
                  showMealprep ? "rotate-180" : ""
                }`}
              />
            </button>
            {showMealprep && (
              <div className="px-5 pb-5 border-t border-border pt-4 animate-fade-in">
                <MealprepPlan plan={data.mealPrepPlan} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat hint */}
      <div className="mt-6 bg-primary-faint rounded-2xl border border-primary-pale p-5 text-center">
        <p className="text-sm text-ink-muted mb-3 flex items-center justify-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          Brauchst du Inspiration zur Zubereitung? Frag einfach im Chat!
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {chatChips.map((chip, idx) => (
            <Link
              key={idx}
              href={`/chat?prefill=${encodeURIComponent(chip)}`}
              className="text-xs bg-primary-pale text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-full font-medium transition-all duration-200"
            >
              {chip}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildChatChips(data: WeekPlanData): string[] {
  const chips: string[] = [];
  const allMeals = data.weekPlan.flatMap((d) => d.meals.map((m) => ({ ...m, day: d.day })));

  if (allMeals.length > 0) {
    const randomMeal = allMeals[Math.floor(Math.random() * allMeals.length)];
    chips.push(`Wie bereite ich ${randomMeal.name} zu?`);
  }
  if (data.weekPlan.length > 0) {
    const randomDay = data.weekPlan[Math.floor(Math.random() * data.weekPlan.length)];
    chips.push(`Schnellere Alternative für ${randomDay.day}?`);
  }
  if (data.shoppingList.length > 3) {
    const randomItem = data.shoppingList[Math.floor(Math.random() * data.shoppingList.length)];
    chips.push(`Was kann ich ${randomItem} ersetzen?`);
  }
  return chips.slice(0, 3);
}
