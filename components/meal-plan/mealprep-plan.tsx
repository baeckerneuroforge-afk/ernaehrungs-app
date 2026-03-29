"use client";

import { ChefHat } from "lucide-react";
import type { MealPrepPlan } from "@/types/meal-plan";

interface Props {
  plan: MealPrepPlan;
}

export function MealprepPlan({ plan }: Props) {
  return (
    <div className="bg-white rounded-xl border border-warm-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <ChefHat className="w-4 h-4 text-accent-warm" />
        <p className="text-sm font-medium text-warm-dark">
          Vorkochtag: {plan.prepDay}
        </p>
      </div>

      <ol className="space-y-2">
        {plan.tasks.map((task, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-warm-text">
            <span className="w-5 h-5 rounded-full bg-accent-warmPale text-accent-warm text-[11px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            {task}
          </li>
        ))}
      </ol>
    </div>
  );
}
