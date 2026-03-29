"use client";

import { useState, useMemo } from "react";
import {
  UtensilsCrossed,
  Loader2,
  ChevronDown,
  Clock,
  Coins,
} from "lucide-react";
import type { PlanParameters, WeekPlanData } from "@/types/meal-plan";
import { FASTING_OPTIONS, MEAL_LABELS, TIMING_RANGES } from "@/types/meal-plan";

interface Props {
  onPlanGenerated: (data: WeekPlanData, params: PlanParameters) => void;
}

function generateTimeSlots(start: number, end: number): string[] {
  const slots: string[] = [];
  for (let h = start; h <= end; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00`);
    if (h < end) slots.push(`${h.toString().padStart(2, "0")}:30`);
  }
  return slots;
}

function getConstrainedRange(
  label: string,
  fasting: string
): { start: number; end: number } {
  const base = TIMING_RANGES[label] || { start: 8, end: 20 };
  if (fasting === "16:8") {
    // Eating window typically 12:00–20:00
    return { start: Math.max(base.start, 12), end: Math.min(base.end, 20) };
  }
  if (fasting === "20:4") {
    // Eating window typically 16:00–20:00
    return { start: Math.max(base.start, 16), end: Math.min(base.end, 20) };
  }
  return base;
}

export function PlanCreator({ onPlanGenerated }: Props) {
  const [fasting, setFasting] = useState("none");
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [flexibleTiming, setFlexibleTiming] = useState(false);
  const [timing, setTiming] = useState<Record<string, string>>({});
  const [mealprep, setMealprep] = useState(false);
  const [mealPrepDays, setMealPrepDays] = useState(3);
  const [periodicEatDays, setPeriodicEatDays] = useState(3);
  const [periodicFastDays, setPeriodicFastDays] = useState(4);
  const [userMessage, setUserMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Constrain meals per day based on fasting
  const minMeals = fasting === "20:4" ? 1 : 2;
  const maxMeals = fasting === "20:4" ? 2 : fasting === "16:8" ? 3 : 5;

  // Auto-adjust if current selection exceeds max or is below min
  if (mealsPerDay > maxMeals) {
    setMealsPerDay(maxMeals);
  }
  if (mealsPerDay < minMeals) {
    setMealsPerDay(minMeals);
  }

  const mealLabels = useMemo(() => MEAL_LABELS[mealsPerDay] || MEAL_LABELS[3], [mealsPerDay]);

  // Build default timing when labels change
  const timingWithDefaults = useMemo(() => {
    const result: Record<string, string> = {};
    mealLabels.forEach((label) => {
      const range = getConstrainedRange(label, fasting);
      result[label] = timing[label] || `${range.start.toString().padStart(2, "0")}:00`;
    });
    return result;
  }, [mealLabels, fasting, timing]);

  async function handleGenerate() {
    setGenerating(true);
    setError("");

    const params: PlanParameters = {
      fasting,
      mealsPerDay,
      timing: flexibleTiming ? {} : timingWithDefaults,
      flexibleTiming,
      mealprep,
      mealPrepDays: mealprep ? mealPrepDays : undefined,
      periodicEatDays: fasting === "periodic" ? periodicEatDays : undefined,
      periodicFastDays: fasting === "periodic" ? periodicFastDays : undefined,
      userMessage: userMessage || undefined,
    };

    try {
      const res = await fetch("/api/ernaehrungsplan/generieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planParameters: params }),
      });

      if (res.status === 402) {
        setError("Nicht genügend Credits. Bitte lade Credits nach.");
        setGenerating(false);
        return;
      }

      if (!res.ok) throw new Error("Generation failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = JSON.parse(line.slice(6));
          if (data.type === "text") {
            fullContent += data.text;
          }
          if (data.type === "error") {
            throw new Error(data.error);
          }
        }
      }

      // Parse JSON from response
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Kein gültiges JSON in der Antwort");

      const planData: WeekPlanData = JSON.parse(jsonMatch[0]);
      onPlanGenerated(planData, params);
    } catch (err) {
      console.error("Plan generation error:", err);
      setError("Plan konnte nicht erstellt werden. Bitte versuche es erneut.");
    } finally {
      setGenerating(false);
    }
  }

  if (generating) {
    return (
      <div className="bg-white rounded-2xl border border-warm-border p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <h3 className="font-semibold text-warm-dark mb-1">Dein Plan wird erstellt...</h3>
        <p className="text-sm text-warm-muted">
          Wir erstellen einen individuellen 7-Tage-Plan basierend auf deinem Profil und deinen Einstellungen.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-warm-border p-5 sm:p-6">
      <h3 className="font-semibold text-warm-dark mb-5">Neuen Plan erstellen</h3>

      {/* 2x2 Grid */}
      <div className="grid sm:grid-cols-2 gap-5 mb-5">
        {/* 1. Fastenmodell */}
        <div>
          <label className="text-xs font-medium text-warm-muted mb-1.5 block">
            Fastenmodell
          </label>
          <div className="relative">
            <select
              value={fasting}
              onChange={(e) => setFasting(e.target.value)}
              className="w-full appearance-none px-3 py-2.5 pr-9 border border-warm-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {FASTING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-light pointer-events-none" />
          </div>
          {fasting === "periodic" && (
            <div className="mt-2">
              <label className="text-[11px] text-warm-muted mb-1 block">
                Wie viele Tage essen / fasten?
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={periodicEatDays}
                    onChange={(e) => setPeriodicEatDays(Math.max(1, Math.min(7, Number(e.target.value))))}
                    className="w-full px-2.5 py-1.5 border border-warm-border rounded-lg text-xs text-center bg-white focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                  <p className="text-[10px] text-warm-light text-center mt-0.5">Essen</p>
                </div>
                <span className="text-xs text-warm-light">/</span>
                <div className="flex-1">
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={periodicFastDays}
                    onChange={(e) => setPeriodicFastDays(Math.max(1, Math.min(7, Number(e.target.value))))}
                    className="w-full px-2.5 py-1.5 border border-warm-border rounded-lg text-xs text-center bg-white focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                  <p className="text-[10px] text-warm-light text-center mt-0.5">Fasten</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Mahlzeiten pro Tag */}
        <div>
          <label className="text-xs font-medium text-warm-muted mb-1.5 block">
            Mahlzeiten pro Tag
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => {
              const disabled = n > maxMeals || n < minMeals;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  onClick={() => setMealsPerDay(n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
                    mealsPerDay === n
                      ? "bg-primary text-white"
                      : disabled
                      ? "bg-surface-muted text-warm-light cursor-not-allowed"
                      : "bg-surface-muted text-warm-muted hover:bg-primary-bg hover:text-primary"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {(maxMeals < 5 || minMeals > 1) && (
            <p className="text-[11px] text-warm-light mt-1">
              Bei {fasting}: {minMeals}–{maxMeals} Mahlzeiten
            </p>
          )}
        </div>

        {/* 3. Timing */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-warm-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Mahlzeitentiming
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={flexibleTiming}
                onChange={(e) => setFlexibleTiming(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-warm-border text-primary focus:ring-primary/20"
              />
              <span className="text-[11px] text-warm-muted">Flexibel</span>
            </label>
          </div>
          {!flexibleTiming ? (
            <div className="space-y-1.5">
              {mealLabels.map((label) => {
                const range = getConstrainedRange(label, fasting);
                const slots = generateTimeSlots(range.start, range.end);
                return (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs text-warm-muted w-24 truncate">{label}</span>
                    <div className="relative flex-1">
                      <select
                        value={timingWithDefaults[label] || slots[0]}
                        onChange={(e) =>
                          setTiming((prev) => ({ ...prev, [label]: e.target.value }))
                        }
                        className="w-full appearance-none px-2.5 py-1.5 pr-7 border border-warm-border rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/20"
                      >
                        {slots.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-warm-light pointer-events-none" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-warm-light py-2">
              KI wählt passende Zeiten basierend auf deinem Profil.
            </p>
          )}
        </div>

        {/* 4. Mealprep */}
        <div>
          <label className="text-xs font-medium text-warm-muted mb-1.5 block">
            Mealprep
          </label>
          <button
            type="button"
            onClick={() => setMealprep(!mealprep)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition text-sm ${
              mealprep
                ? "border-primary bg-primary-bg/30 text-primary"
                : "border-warm-border text-warm-muted hover:border-primary/30"
            }`}
          >
            <span>Mealprep-freundlich</span>
            <div
              className={`w-9 h-5 rounded-full transition-colors relative ${
                mealprep ? "bg-primary" : "bg-warm-border"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  mealprep ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
          {mealprep && (
            <div className="mt-2">
              <label className="text-[11px] text-warm-muted mb-1 block">
                Für wie viele Tage vorkochen?
              </label>
              <div className="flex gap-1.5">
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMealPrepDays(n)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                      mealPrepDays === n
                        ? "bg-primary text-white"
                        : "bg-surface-muted text-warm-muted hover:bg-primary-bg"
                    }`}
                  >
                    {n} Tage
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat input */}
      <div className="mb-4">
        <label className="text-xs font-medium text-warm-muted mb-1.5 block">
          Individuelle Wünsche (optional)
        </label>
        <input
          type="text"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder="z.B. 'Kein Brokkoli', 'Mittwoch bin ich unterwegs', 'Mehr asiatische Gerichte'..."
          className="w-full px-3 py-2.5 border border-warm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 mb-3">{error}</p>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-light transition"
      >
        <UtensilsCrossed className="w-4 h-4" />
        Ernährungsplan erstellen
        <span className="flex items-center gap-0.5 text-xs opacity-80 ml-1">
          <Coins className="w-3 h-3" />3
        </span>
      </button>
    </div>
  );
}
