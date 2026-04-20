"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WeightChart } from "@/components/tracker/weight-chart";
import type { WeightLog, Ziel } from "@/types";
import {
  Plus,
  Trash2,
  Loader2,
  Scale,
  X,
  Pencil,
  ChevronDown,
  Target,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import {
  type RangeKey,
  filterByRange,
  totalChange,
  changeOverDays,
  avgChangePerWeek,
  minMax,
  daysSinceLast,
  projectGoal,
  progressPercent,
  formatDateShort,
  formatDateLong,
} from "@/lib/weight-stats";

const RANGE_LABELS: Record<RangeKey, string> = {
  week: "Woche",
  month: "Monat",
  "3months": "3 Monate",
  year: "Jahr",
  all: "Alle",
};

type EntryForm = {
  id: string | null;
  gewicht: string;
  notiz: string;
  datum: string;
};

const emptyForm = (): EntryForm => ({
  id: null,
  gewicht: "",
  notiz: "",
  datum: new Date().toISOString().split("T")[0],
});

export default function GewichtPage() {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [goal, setGoal] = useState<Ziel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [range, setRange] = useState<RangeKey>("month");
  const [listOpen, setListOpen] = useState(false);

  const loadAll = useCallback(async () => {
    const [logsRes, zieleRes] = await Promise.all([
      fetch("/api/tracker/gewicht"),
      fetch("/api/tracker/ziele"),
    ]);
    if (logsRes.ok) setLogs(await logsRes.json());
    if (zieleRes.ok) {
      const zieleList = (await zieleRes.json()) as Ziel[];
      // Aktives Gewichtsziel mit Zielwert — jüngstes gewinnt
      const active = zieleList
        .filter((z) => z.typ === "gewicht" && !z.erreicht && z.zielwert != null)
        .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];
      setGoal(active ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function openNew() {
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(log: WeightLog) {
    setForm({
      id: log.id,
      gewicht: String(log.gewicht_kg),
      notiz: log.notiz ?? "",
      datum: log.gemessen_am,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.gewicht) return;
    setSaving(true);

    const body = JSON.stringify({
      gewicht_kg: parseFloat(form.gewicht),
      notiz: form.notiz || null,
      gemessen_am: form.datum,
    });

    const res = form.id
      ? await fetch(`/api/tracker/gewicht/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        })
      : await fetch("/api/tracker/gewicht", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

    if (res.ok) {
      setModalOpen(false);
      setForm(emptyForm());
      loadAll();
      toast.success(form.id ? "Eintrag aktualisiert" : "Gewicht eingetragen");
    } else {
      toast.error("Speichern fehlgeschlagen");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/tracker/gewicht/${id}`, { method: "DELETE" });
    setDeleting(null);
    loadAll();
    if (res.ok) {
      toast.success("Eintrag gelöscht");
    } else {
      toast.error("Löschen fehlgeschlagen");
    }
  }

  // -------------------------------------------------------------------------
  // Abgeleitete Werte
  // -------------------------------------------------------------------------
  const derived = useMemo(() => {
    const hasAny = logs.length > 0;
    const latest = hasAny ? logs[logs.length - 1] : null;
    const first = hasAny ? logs[0] : null;

    const currentWeight = latest?.gewicht_kg ?? null;
    const startWeight = goal?.startwert ?? first?.gewicht_kg ?? null;
    const startDate = goal?.created_at ?? first?.gemessen_am ?? null;
    const targetWeight = goal?.zielwert ?? null;

    const change =
      currentWeight != null && startWeight != null
        ? currentWeight - startWeight
        : 0;

    const remainingKg =
      currentWeight != null && targetWeight != null
        ? targetWeight - currentWeight
        : null;

    const dsl = daysSinceLast(logs);

    const weeklyChange = changeOverDays(logs, 7);
    const monthlyChange = changeOverDays(logs, 28);
    const avgWeekly = avgChangePerWeek(logs);
    const { min, max } = minMax(logs);
    const total = totalChange(logs);

    const rangeData = filterByRange(logs, range);

    const projection =
      targetWeight != null ? projectGoal(logs, targetWeight) : null;

    const progress =
      startWeight != null && currentWeight != null && targetWeight != null
        ? progressPercent(startWeight, currentWeight, targetWeight)
        : null;

    return {
      hasAny,
      latest,
      currentWeight,
      startWeight,
      startDate,
      targetWeight,
      change,
      remainingKg,
      daysSince: dsl,
      weeklyChange,
      monthlyChange,
      avgWeekly,
      min,
      max,
      total,
      rangeData,
      projection,
      progress,
    };
  }, [logs, goal, range]);

  // Ziel-Richtung: gewichtsziel.beschreibung enthält "Abnehmen"/"Zunehmen"/"Halten"?
  // Besser: aus (target - start) ableiten.
  const goalDirection: "lose" | "gain" | "maintain" | null = useMemo(() => {
    if (derived.startWeight == null || derived.targetWeight == null) return null;
    const diff = derived.targetWeight - derived.startWeight;
    if (Math.abs(diff) < 0.5) return "maintain";
    return diff < 0 ? "lose" : "gain";
  }, [derived.startWeight, derived.targetWeight]);

  function changeColor(value: number): string {
    if (goalDirection === "maintain") {
      return Math.abs(value) < 0.5 ? "text-emerald-600" : "text-amber-600";
    }
    if (goalDirection === "lose") {
      return value < 0 ? "text-emerald-600" : value > 0 ? "text-amber-600" : "text-ink-muted";
    }
    if (goalDirection === "gain") {
      return value > 0 ? "text-emerald-600" : value < 0 ? "text-amber-600" : "text-ink-muted";
    }
    return value < 0 ? "text-emerald-600" : value > 0 ? "text-amber-600" : "text-ink-muted";
  }

  const pacingWarning =
    derived.avgWeekly !== 0 && Math.abs(derived.avgWeekly) > 1;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full animate-fade-in">
        {/* Header mit prominent CTA */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-ink">
              Gewichtstracker
            </h1>
            <p className="text-ink-muted text-sm mt-1">
              Dein Fortschritt im Überblick
            </p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full text-sm font-medium transition shadow-card w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Gewicht eintragen
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-sm text-ink-muted">Gewichte werden geladen …</p>
          </div>
        ) : !derived.hasAny ? (
          <div className="bg-white rounded-2xl border border-border p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-pale flex items-center justify-center mx-auto mb-3">
              <Scale className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-ink-muted mb-4">
              Noch keine Einträge. Starte mit deinem ersten Gewicht.
            </p>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              Ersten Eintrag anlegen
            </button>
          </div>
        ) : (
          <>
            {/* 1. Quick-Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Aktuell"
                value={`${derived.currentWeight?.toFixed(1)} kg`}
                subtitle={
                  derived.daysSince != null
                    ? derived.daysSince === 0
                      ? "heute"
                      : derived.daysSince === 1
                        ? "gestern"
                        : `vor ${derived.daysSince} Tagen`
                    : undefined
                }
              />
              <StatCard
                label="Start"
                value={
                  derived.startWeight != null
                    ? `${derived.startWeight.toFixed(1)} kg`
                    : "—"
                }
                subtitle={
                  derived.startDate
                    ? formatDateShort(derived.startDate.split("T")[0])
                    : undefined
                }
              />
              <StatCard
                label="Veränderung"
                value={`${derived.change > 0 ? "+" : ""}${derived.change.toFixed(1)} kg`}
                valueClass={changeColor(derived.change)}
                subtitle="gesamt"
              />
              <StatCard
                label="Noch bis Ziel"
                value={
                  derived.remainingKg != null
                    ? `${Math.abs(derived.remainingKg).toFixed(1)} kg`
                    : "—"
                }
                subtitle={
                  goal?.zieldatum
                    ? `bis ${formatDateShort(goal.zieldatum)}`
                    : derived.targetWeight == null
                      ? "Kein Ziel"
                      : undefined
                }
              />
            </div>

            {/* 2. Fortschrittsbalken + Prognose */}
            {derived.targetWeight != null &&
              derived.startWeight != null &&
              derived.currentWeight != null &&
              derived.progress != null && (
                <div className="bg-white rounded-2xl border border-border shadow-card p-5 mb-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Ziel-Fortschritt
                    </h3>
                    <span className="text-xs text-ink-muted">
                      {derived.progress}% geschafft
                    </span>
                  </div>
                  <div className="relative w-full bg-surface-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${derived.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-ink-faint">
                    <span>{derived.startWeight.toFixed(1)} kg</span>
                    <span className="font-medium text-ink">
                      {derived.currentWeight.toFixed(1)} kg
                    </span>
                    <span>{derived.targetWeight.toFixed(1)} kg</span>
                  </div>
                  {derived.projection && (
                    <div className="bg-primary-pale/50 rounded-xl px-4 py-3 text-sm">
                      <p className="text-ink font-medium">
                        {derived.projection.message}
                      </p>
                      {derived.projection.kgPerWeek !== 0 && (
                        <p className="text-xs text-ink-muted mt-1">
                          Trend der letzten 4 Wochen:{" "}
                          {derived.projection.kgPerWeek > 0 ? "+" : ""}
                          {derived.projection.kgPerWeek.toFixed(2)} kg / Woche
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

            {/* Kein Ziel gesetzt → CTA */}
            {derived.targetWeight == null && (
              <Link
                href="/tracker/ziele"
                className="flex items-center gap-3 bg-white rounded-2xl border border-dashed border-primary/40 p-5 hover:border-primary hover:bg-primary-pale/30 transition-all group mb-6"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-pale flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">
                    Setz dir ein Gewichtsziel
                  </p>
                  <p className="text-xs text-ink-muted">
                    Mit Ziel siehst du Fortschritt und Prognose.
                  </p>
                </div>
                <span className="text-xs text-primary font-medium whitespace-nowrap group-hover:translate-x-0.5 transition-transform">
                  Los →
                </span>
              </Link>
            )}

            {/* 3. Chart mit Range-Filter */}
            <div className="bg-white rounded-2xl border border-border shadow-card p-4 sm:p-5 mb-6">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h3 className="font-semibold text-sm text-ink">Verlauf</h3>
                <div className="flex gap-0.5 bg-surface-muted rounded-lg p-0.5">
                  {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setRange(key)}
                      className={`px-2.5 py-1 text-xs rounded-md transition ${
                        range === key
                          ? "bg-white shadow-sm text-ink font-medium"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      {RANGE_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>
              {derived.rangeData.length >= 2 ? (
                <WeightChart
                  data={derived.rangeData}
                  targetWeight={derived.targetWeight ?? undefined}
                  showTrend={derived.rangeData.length >= 7}
                  height={280}
                />
              ) : (
                <div className="text-center py-8 text-sm text-ink-muted">
                  In diesem Zeitraum gibt es nur {derived.rangeData.length}{" "}
                  {derived.rangeData.length === 1 ? "Eintrag" : "Einträge"}.
                  Wähle einen längeren Zeitraum oder trage mehr Gewichte ein.
                </div>
              )}
            </div>

            {/* 4. Durchschnitte / Statistik-Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <StatBox
                label="Tiefster Wert"
                value={derived.min ? `${derived.min.gewicht_kg.toFixed(1)} kg` : "—"}
                subtitle={
                  derived.min ? formatDateShort(derived.min.gemessen_am) : undefined
                }
              />
              <StatBox
                label="Höchster Wert"
                value={derived.max ? `${derived.max.gewicht_kg.toFixed(1)} kg` : "—"}
                subtitle={
                  derived.max ? formatDateShort(derived.max.gemessen_am) : undefined
                }
              />
              <StatBox
                label="Einträge gesamt"
                value={`${logs.length}`}
                subtitle={
                  derived.startDate
                    ? `seit ${formatDateShort(derived.startDate.split("T")[0])}`
                    : undefined
                }
              />
            </div>

            {/* 5. Tempo-Analyse */}
            <div className="bg-white rounded-2xl border border-border shadow-card p-5 mb-6">
              <h3 className="font-semibold text-sm text-ink mb-3">Dein Tempo</h3>
              <div className="space-y-3">
                <PaceRow
                  label="Letzte 7 Tage"
                  value={derived.weeklyChange}
                  color={
                    derived.weeklyChange != null
                      ? changeColor(derived.weeklyChange)
                      : "text-ink-muted"
                  }
                />
                <PaceRow
                  label="Letzte 4 Wochen"
                  value={derived.monthlyChange}
                  color={
                    derived.monthlyChange != null
                      ? changeColor(derived.monthlyChange)
                      : "text-ink-muted"
                  }
                />
                <PaceRow
                  label="Ø pro Woche"
                  value={derived.avgWeekly}
                  color="text-ink"
                  showZero
                />
                {pacingWarning && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 text-sm flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-300">
                        Dein Tempo ist recht hoch
                      </p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed">
                        Mehr als 1 kg pro Woche ist für nachhaltiges{" "}
                        {derived.avgWeekly < 0 ? "Abnehmen" : "Zunehmen"} meist
                        zu schnell. Das kann zu Muskelverlust oder Jo-Jo-Effekt
                        führen.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 6. Alle Einträge — collapsible */}
            <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
              <button
                onClick={() => setListOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-muted transition-colors"
              >
                <span className="font-semibold text-sm text-ink">
                  Alle Einträge ({logs.length})
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-ink-faint transition-transform duration-200 ${
                    listOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {listOpen && (
                <div className="border-t border-border max-h-96 overflow-y-auto">
                  {[...logs].reverse().map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0 hover:bg-surface-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">
                          {log.gewicht_kg.toFixed(1)} kg
                        </p>
                        <p className="text-xs text-ink-muted mt-0.5 truncate">
                          {formatDateLong(log.gemessen_am)}
                          {log.notiz && (
                            <span className="italic"> · {log.notiz}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(log)}
                          className="p-2 text-ink-muted hover:text-primary hover:bg-primary-pale rounded-lg transition"
                          aria-label="Bearbeiten"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          disabled={deleting === log.id}
                          className="p-2 text-ink-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          aria-label="Löschen"
                        >
                          {deleting === log.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Mobile-FAB — zusätzlich zum Header-Button, immer greifbar beim Scrollen */}
      <button
        onClick={openNew}
        className="fixed bottom-24 md:hidden right-6 z-40 bg-primary hover:bg-primary-hover text-white rounded-full shadow-lg p-4 transition-all active:scale-95"
        aria-label="Neuen Eintrag hinzufügen"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-pop animate-slide-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-ink">
                {form.id ? "Eintrag bearbeiten" : "Neuer Eintrag"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-ink-faint hover:text-ink transition p-1"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-ink-muted mb-1 block">
                  Gewicht (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="400"
                  value={form.gewicht}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gewicht: e.target.value }))
                  }
                  placeholder="z.B. 72.5"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Datum</label>
                <input
                  type="date"
                  value={form.datum}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, datum: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">
                  Notiz (optional)
                </label>
                <input
                  type="text"
                  value={form.notiz}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notiz: e.target.value }))
                  }
                  placeholder="z.B. nach dem Sport, morgens nüchtern …"
                  maxLength={500}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !form.gewicht}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-3 rounded-full text-sm font-medium transition disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : form.id ? (
                  <Pencil className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {form.id ? "Speichern" : "Eintragen"}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Stat primitives
// -----------------------------------------------------------------------------

function StatCard({
  label,
  value,
  subtitle,
  valueClass,
}: {
  label: string;
  value: string;
  subtitle?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-4">
      <p className="text-[10px] uppercase tracking-wide text-ink-faint mb-1">
        {label}
      </p>
      <p
        className={`text-lg sm:text-xl font-serif leading-tight ${
          valueClass ?? "text-ink"
        }`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-[11px] text-ink-muted mt-0.5 truncate">{subtitle}</p>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-3">
      <p className="text-[10px] uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="text-base font-semibold text-ink mt-0.5">{value}</p>
      {subtitle && (
        <p className="text-[11px] text-ink-faint mt-0.5 truncate">{subtitle}</p>
      )}
    </div>
  );
}

function PaceRow({
  label,
  value,
  color,
  showZero,
}: {
  label: string;
  value: number | null;
  color: string;
  showZero?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className={`text-sm font-medium ${color}`}>
        {value == null
          ? "—"
          : Math.abs(value) < 0.005 && !showZero
            ? "±0,00 kg"
            : `${value > 0 ? "+" : ""}${value.toFixed(2)} kg`}
      </span>
    </div>
  );
}
