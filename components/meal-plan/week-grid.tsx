"use client";

import { useState } from "react";
import type { WeekPlanData, Meal, PlanParameters } from "@/types/meal-plan";
import { MealDetail } from "./meal-detail";
import { ShoppingList } from "./shopping-list";
import { MealprepPlan } from "./mealprep-plan";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  ChefHat,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";

interface Props {
  data: WeekPlanData;
  params: PlanParameters;
}

const DAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function WeekGrid({ data, params }: Props) {
  const [selectedMeal, setSelectedMeal] = useState<{ meal: Meal; day: string } | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [showShopping, setShowShopping] = useState(false);
  const [showMealprep, setShowMealprep] = useState(false);

  const days = data.weekPlan;
  const mealTypes = days[0]?.meals.map((m) => m.type) || [];

  // Dynamic chat chips from plan data
  const chatChips = buildChatChips(data);

  return (
    <div>
      {/* Meal Detail Modal */}
      {selectedMeal && (
        <MealDetail
          meal={selectedMeal.meal}
          day={selectedMeal.day}
          onClose={() => setSelectedMeal(null)}
        />
      )}

      {/* Desktop Grid (hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-2xl border border-warm-border overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-7 border-b border-warm-border">
          {days.map((day) => (
            <div
              key={day.day}
              className="px-2 py-3 text-center text-xs font-semibold text-warm-dark border-r border-warm-border last:border-r-0"
            >
              {day.day}
            </div>
          ))}
        </div>

        {/* Meal rows */}
        {mealTypes.map((mealType, rowIdx) => (
          <div
            key={mealType}
            className={`grid grid-cols-7 ${rowIdx < mealTypes.length - 1 ? "border-b border-warm-border" : ""}`}
          >
            {days.map((day) => {
              const meal = day.meals.find((m) => m.type === mealType);
              if (!meal) return <div key={day.day} className="p-2 border-r border-warm-border last:border-r-0" />;
              return (
                <button
                  key={day.day}
                  onClick={() => setSelectedMeal({ meal, day: day.day })}
                  className="p-2.5 border-r border-warm-border last:border-r-0 text-left hover:bg-primary-bg/20 transition group"
                >
                  <p className="text-[10px] text-warm-light mb-0.5">{meal.time}</p>
                  <p className="text-xs font-medium text-warm-dark group-hover:text-primary transition leading-tight">
                    {meal.name}
                  </p>
                  <p className="text-[10px] text-warm-muted mt-0.5 line-clamp-1">
                    {meal.shortDescription}
                  </p>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        {/* Day tabs */}
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {days.map((day, idx) => (
            <button
              key={day.day}
              onClick={() => setActiveDay(idx)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition ${
                activeDay === idx
                  ? "bg-primary text-white"
                  : "bg-surface-muted text-warm-muted"
              }`}
            >
              {DAYS_SHORT[idx] || day.day.slice(0, 2)}
            </button>
          ))}
        </div>

        {/* Swipe navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setActiveDay(Math.max(0, activeDay - 1))}
            disabled={activeDay === 0}
            className="p-1.5 text-warm-muted disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-semibold text-warm-dark">{days[activeDay]?.day}</h3>
          <button
            onClick={() => setActiveDay(Math.min(days.length - 1, activeDay + 1))}
            disabled={activeDay === days.length - 1}
            className="p-1.5 text-warm-muted disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day cards */}
        <div className="space-y-2">
          {days[activeDay]?.meals.map((meal, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedMeal({ meal, day: days[activeDay].day })}
              className="w-full bg-white rounded-xl border border-warm-border p-4 text-left hover:border-primary/30 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[11px] text-warm-light">{meal.time} · {meal.type}</p>
                  <p className="text-sm font-medium text-warm-dark mt-0.5">{meal.name}</p>
                  <p className="text-xs text-warm-muted mt-1">{meal.shortDescription}</p>
                </div>
                {meal.calories && (
                  <span className="text-[11px] text-warm-light ml-2 flex-shrink-0">
                    ~{meal.calories} kcal
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Expandable sections */}
      <div className="mt-5 space-y-2">
        {/* Shopping List */}
        <button
          onClick={() => setShowShopping(!showShopping)}
          className="w-full flex items-center justify-between bg-white rounded-xl border border-warm-border px-4 py-3 hover:border-primary/30 transition"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-warm-dark">
            <ShoppingCart className="w-4 h-4 text-primary" />
            Einkaufsliste
          </span>
          <ChevronRight className={`w-4 h-4 text-warm-light transition-transform ${showShopping ? "rotate-90" : ""}`} />
        </button>
        {showShopping && (
          <ShoppingList items={data.shoppingList} />
        )}

        {/* Mealprep */}
        {params.mealprep && data.mealPrepPlan && (
          <>
            <button
              onClick={() => setShowMealprep(!showMealprep)}
              className="w-full flex items-center justify-between bg-white rounded-xl border border-warm-border px-4 py-3 hover:border-primary/30 transition"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-warm-dark">
                <ChefHat className="w-4 h-4 text-primary" />
                Mealprep-Plan
              </span>
              <ChevronRight className={`w-4 h-4 text-warm-light transition-transform ${showMealprep ? "rotate-90" : ""}`} />
            </button>
            {showMealprep && <MealprepPlan plan={data.mealPrepPlan} />}
          </>
        )}
      </div>

      {/* Chat hint */}
      <div className="mt-5 bg-surface-muted rounded-xl p-4 text-center">
        <p className="text-xs text-warm-muted mb-3 flex items-center justify-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" />
          Brauchst du Inspiration zur Zubereitung? Frag einfach im Chat!
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {chatChips.map((chip, idx) => (
            <Link
              key={idx}
              href={`/chat?prefill=${encodeURIComponent(chip)}`}
              className="text-xs bg-white border border-warm-border px-3 py-1.5 rounded-full text-warm-muted hover:border-primary/30 hover:text-primary transition"
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
