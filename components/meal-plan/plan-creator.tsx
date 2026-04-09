"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  Clock,
  Utensils,
  ChefHat,
  Salad,
  Sparkles,
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
    return { start: Math.max(base.start, 12), end: Math.min(base.end, 20) };
  }
  if (fasting === "20:4") {
    return { start: Math.max(base.start, 16), end: Math.min(base.end, 20) };
  }
  return base;
}

/* ------------------------------------------------------------------ */
/* Reusable primitives                                                 */
/* ------------------------------------------------------------------ */

function SectionCard({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-card hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-full bg-primary-pale flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </span>
        <h4 className="text-sm font-semibold text-ink">{label}</h4>
      </div>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  const padding = size === "sm" ? "px-2.5 py-1.5 pr-7 text-xs" : "px-3 py-2.5 pr-9 text-sm";
  const iconPos = size === "sm" ? "right-2 w-3 h-3" : "right-3 w-4 h-4";
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none ${padding} border border-border rounded-xl bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition`}
      >
        {children}
      </select>
      <ChevronDown className={`absolute ${iconPos} top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none`} />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
        checked ? "bg-primary" : "bg-border"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-border p-6 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary-pale animate-pulse" />
          <div className="h-4 w-48 bg-surface-muted rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full bg-surface-muted rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-surface-muted rounded animate-pulse" />
          <div className="h-3 w-4/6 bg-surface-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-5 shadow-card">
            <div className="h-4 w-24 bg-surface-muted rounded animate-pulse mb-3" />
            <div className="h-8 w-full bg-surface-muted rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-ink-muted animate-pulse">
        Dein individueller 7-Tage-Plan wird erstellt...
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

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

  const minMeals = fasting === "20:4" ? 1 : 2;
  const maxMeals = fasting === "20:4" ? 2 : fasting === "16:8" ? 3 : 5;

  if (mealsPerDay > maxMeals) {
    setMealsPerDay(maxMeals);
  }
  if (mealsPerDay < minMeals) {
    setMealsPerDay(minMeals);
  }

  const mealLabels = useMemo(() => MEAL_LABELS[mealsPerDay] || MEAL_LABELS[3], [mealsPerDay]);

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
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid sm:grid-cols-2 gap-4">
        {/* 1. Fastenmodell */}
        <SectionCard icon={Clock} label="Fastenmodell">
          <Select value={fasting} onChange={setFasting}>
            {FASTING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          {fasting === "periodic" && (
            <div className="mt-3">
              <label className="text-[11px] text-ink-muted mb-1.5 block">
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
                    className="w-full px-2.5 py-1.5 border border-border rounded-lg text-xs text-center bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-[10px] text-ink-faint text-center mt-0.5">Essen</p>
                </div>
                <span className="text-xs text-ink-faint">/</span>
                <div className="flex-1">
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={periodicFastDays}
                    onChange={(e) => setPeriodicFastDays(Math.max(1, Math.min(7, Number(e.target.value))))}
                    className="w-full px-2.5 py-1.5 border border-border rounded-lg text-xs text-center bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-[10px] text-ink-faint text-center mt-0.5">Fasten</p>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* 2. Mahlzeiten pro Tag */}
        <SectionCard icon={Utensils} label="Mahlzeiten pro Tag">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => {
              const disabled = n > maxMeals || n < minMeals;
              const active = mealsPerDay === n;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  onClick={() => setMealsPerDay(n)}
                  className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-primary text-white shadow-card"
                      : disabled
                      ? "bg-surface-muted text-ink-faint cursor-not-allowed opacity-60"
                      : "bg-primary-pale text-primary hover:bg-primary hover:text-white"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {(maxMeals < 5 || minMeals > 1) && (
            <p className="text-[11px] text-ink-faint mt-2">
              Bei {fasting}: {minMeals}–{maxMeals} Mahlzeiten möglich
            </p>
          )}
        </SectionCard>

        {/* 3. Timing */}
        <SectionCard icon={Salad} label="Mahlzeitentiming">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-muted">Uhrzeiten festlegen</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] text-ink-muted">Flexibel</span>
              <Toggle checked={flexibleTiming} onChange={setFlexibleTiming} />
            </label>
          </div>
          {!flexibleTiming ? (
            <div className="space-y-1.5">
              {mealLabels.map((label) => {
                const range = getConstrainedRange(label, fasting);
                const slots = generateTimeSlots(range.start, range.end);
                return (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs text-ink-muted w-24 truncate">{label}</span>
                    <div className="flex-1">
                      <Select
                        size="sm"
                        value={timingWithDefaults[label] || slots[0]}
                        onChange={(v) => setTiming((prev) => ({ ...prev, [label]: v }))}
                      >
                        {slots.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-ink-faint py-2">
              KI wählt passende Zeiten basierend auf deinem Profil.
            </p>
          )}
        </SectionCard>

        {/* 4. Mealprep */}
        <SectionCard icon={ChefHat} label="Mealprep">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-muted">Mealprep-freundlich</span>
            <Toggle checked={mealprep} onChange={setMealprep} />
          </div>
          {mealprep && (
            <div className="mt-3 pt-3 border-t border-border">
              <label className="text-[11px] text-ink-muted mb-1.5 block">
                Für wie viele Tage vorkochen?
              </label>
              <div className="flex gap-1.5">
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMealPrepDays(n)}
                    className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      mealPrepDays === n
                        ? "bg-primary text-white shadow-card"
                        : "bg-primary-pale text-primary hover:bg-primary hover:text-white"
                    }`}
                  >
                    {n} Tage
                  </button>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Chat input */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-8 h-8 rounded-full bg-primary-pale flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </span>
          <h4 className="text-sm font-semibold text-ink">Individuelle Wünsche</h4>
          <span className="text-[11px] text-ink-faint">(optional)</span>
        </div>
        <input
          type="text"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder="z.B. 'Kein Brokkoli', 'Mittwoch bin ich unterwegs', 'Mehr asiatische Gerichte'..."
          className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Generate button */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white rounded-full px-6 py-3 font-medium shadow-card hover:shadow-card-hover transition-all duration-200"
        >
          <Sparkles className="w-4 h-4" />
          Ernährungsplan erstellen
          <span className="text-xs opacity-80">· 5 Credits</span>
        </button>
      </div>
    </div>
  );
}
