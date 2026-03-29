"use client";

import { X, Clock, ChefHat } from "lucide-react";
import type { Meal } from "@/types/meal-plan";
import Link from "next/link";

interface Props {
  meal: Meal;
  day: string;
  onClose: () => void;
}

export function MealDetail({ meal, day, onClose }: Props) {
  const recipe = meal.fullRecipe;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-lg w-full mx-0 sm:mx-4 max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-warm-border px-5 py-4 flex items-start justify-between rounded-t-2xl">
          <div>
            <p className="text-[11px] text-warm-light">{day} · {meal.time} · {meal.type}</p>
            <h2 className="text-lg font-semibold text-warm-dark mt-0.5">{meal.name}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-warm-light hover:text-warm-dark transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-warm-muted">
            {recipe.prepTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {recipe.prepTime}
              </span>
            )}
            {meal.calories && <span>~{meal.calories} kcal</span>}
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="text-sm font-semibold text-warm-dark mb-2">Zutaten</h3>
            <ul className="space-y-1">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-sm text-warm-text flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div>
            <h3 className="text-sm font-semibold text-warm-dark mb-2">Zubereitung</h3>
            <ol className="space-y-2">
              {recipe.steps.map((step, i) => (
                <li key={i} className="text-sm text-warm-text flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary-bg text-primary text-[11px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Mealprep note */}
          {recipe.mealPrepNote && (
            <div className="bg-accent-warmPale rounded-xl px-4 py-3 flex items-start gap-2">
              <ChefHat className="w-4 h-4 text-accent-warm mt-0.5 flex-shrink-0" />
              <p className="text-xs text-warm-text">{recipe.mealPrepNote}</p>
            </div>
          )}

          {/* Chat link */}
          <Link
            href={`/chat?prefill=${encodeURIComponent(`Gibt es eine Alternative für ${meal.name} am ${day}?`)}`}
            className="block w-full text-center text-sm text-primary font-medium bg-primary-bg rounded-xl py-2.5 hover:bg-primary-pale transition"
          >
            Frag im Chat nach Alternativen
          </Link>
        </div>
      </div>
    </div>
  );
}
