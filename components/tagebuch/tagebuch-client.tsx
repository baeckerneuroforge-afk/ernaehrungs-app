"use client";

import { useState, useEffect, useRef } from "react";
import { FoodLog, MAHLZEIT_TYPEN } from "@/types";
import {
  Plus,
  Trash2,
  Loader2,
  UtensilsCrossed,
  Sunrise,
  Sun,
  Moon,
  Apple,
  Calendar,
  X,
} from "lucide-react";

interface Props {
  initialEntries: FoodLog[];
  today: string;
}

type MealTyp = "fruehstueck" | "mittag" | "abend" | "snack";

const MEAL_STYLES: Record<
  MealTyp,
  { badge: string; icon: typeof Sunrise; label: string }
> = {
  fruehstueck: {
    badge: "bg-orange-100 text-orange-700",
    icon: Sunrise,
    label: "Frühstück",
  },
  mittag: {
    badge: "bg-yellow-100 text-yellow-700",
    icon: Sun,
    label: "Mittagessen",
  },
  abend: {
    badge: "bg-indigo-100 text-indigo-700",
    icon: Moon,
    label: "Abendessen",
  },
  snack: {
    badge: "bg-surface-muted text-ink-muted",
    icon: Apple,
    label: "Snack",
  },
};

function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildWeekStrip(center: string): Date[] {
  const centerDate = new Date(center + "T00:00:00");
  const days: Date[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() + i);
    days.push(d);
  }
  return days;
}

const WEEKDAYS_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function TagebuchClient({ initialEntries, today }: Props) {
  const [datum, setDatum] = useState(today);
  const [entries, setEntries] = useState<FoodLog[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTyp, setFormTyp] = useState<MealTyp>("fruehstueck");
  const [formBeschreibung, setFormBeschreibung] = useState("");
  const [formKcal, setFormKcal] = useState("");
  const [formUhrzeit, setFormUhrzeit] = useState("");

  function openForm() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setFormUhrzeit(`${hh}:${mm}`);
    // Smart default based on time of day
    const h = now.getHours();
    if (h < 11) setFormTyp("fruehstueck");
    else if (h < 15) setFormTyp("mittag");
    else if (h < 20) setFormTyp("abend");
    else setFormTyp("snack");
    setShowForm(true);
  }

  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (datum === today && entries === initialEntries) return;
    setLoading(true);
    fetch(`/api/tagebuch?datum=${datum}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setEntries(data);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datum]);

  async function handleAdd() {
    if (!formBeschreibung.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tagebuch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mahlzeit_typ: formTyp,
        beschreibung: formBeschreibung.trim(),
        kalorien_geschaetzt: formKcal ? parseInt(formKcal) : null,
        uhrzeit: formUhrzeit || null,
        datum,
      }),
    });
    if (res.ok) {
      const entry = await res.json();
      setEntries((prev) => [...prev, entry]);
      setFormBeschreibung("");
      setFormKcal("");
      setShowForm(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/tagebuch/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  }

  // Group by meal type
  const grouped = MAHLZEIT_TYPEN.map((typ) => ({
    ...typ,
    items: entries.filter((e) => e.mahlzeit_typ === typ.value),
  }));

  // Totals
  const totalKcal = entries.reduce(
    (sum, e) => sum + (e.kalorien_geschaetzt || 0),
    0
  );

  const weekDays = buildWeekStrip(datum);

  return (
    <div className="space-y-6">
      {/* Horizontal 7-day calendar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink">Kalender</h2>
          <button
            onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-primary transition"
          >
            <Calendar className="w-3.5 h-3.5" />
            Datum wählen
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="sr-only"
            aria-hidden
          />
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          {weekDays.map((d) => {
            const iso = formatISODate(d);
            const isActive = iso === datum;
            const isToday = iso === today;
            return (
              <button
                key={iso}
                onClick={() => setDatum(iso)}
                className={`flex flex-col items-center gap-1.5 min-w-[52px] py-2 px-2 rounded-2xl transition ${
                  isActive ? "bg-primary-faint" : "hover:bg-surface-muted"
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide text-ink-faint font-medium">
                  {WEEKDAYS_SHORT[d.getDay()]}
                </span>
                <span
                  className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : isToday
                      ? "text-primary"
                      : "text-ink"
                  }`}
                >
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-surface-muted rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint">
            Kalorien
          </p>
          <p className="text-sm font-semibold text-ink mt-0.5">
            {totalKcal > 0 ? totalKcal : "—"}
            <span className="text-xs font-normal text-ink-faint ml-1">kcal</span>
          </p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint">
            Protein
          </p>
          <p className="text-sm font-semibold text-ink-muted mt-0.5">—</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint">
            Carbs
          </p>
          <p className="text-sm font-semibold text-ink-muted mt-0.5">—</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint">
            Fett
          </p>
          <p className="text-sm font-semibold text-ink-muted mt-0.5">—</p>
        </div>
      </div>

      {/* Desktop primary CTA — full width under the macro bar */}
      <button
        onClick={openForm}
        className="hidden md:flex w-full items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium py-3.5 rounded-full shadow-card transition"
      >
        <Plus className="w-4 h-4" />
        Mahlzeit eintragen
      </button>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-10 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-primary-faint flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-serif text-lg text-ink mb-1">
            Noch keine Einträge
          </h3>
          <p className="text-sm text-ink-muted mb-5">
            Trage ein, was du heute gegessen hast.
          </p>
          <button
            onClick={openForm}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-6 py-2.5 rounded-full shadow-card transition"
          >
            Erste Mahlzeit eintragen
            <span aria-hidden>→</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {grouped.map((group) => {
            const style = MEAL_STYLES[group.value as MealTyp];
            const Icon = style.icon;
            if (group.items.length === 0) return null;
            const groupKcal = group.items.reduce(
              (s, i) => s + (i.kalorien_geschaetzt || 0),
              0
            );
            return (
              <section key={group.value} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg text-ink flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${style.badge}`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    {group.label}
                  </h3>
                  {groupKcal > 0 && (
                    <span className="text-xs text-ink-faint">
                      {groupKcal} kcal
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {group.items.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white rounded-2xl border border-border p-4 flex items-start justify-between gap-3 shadow-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full ${style.badge}`}
                          >
                            <Icon className="w-3 h-3" />
                            {style.label}
                          </span>
                        </div>
                        <p className="text-sm text-ink leading-relaxed">
                          {entry.beschreibung}
                        </p>
                        {entry.kalorien_geschaetzt && (
                          <p className="text-xs text-ink-faint mt-1.5">
                            ~{entry.kalorien_geschaetzt} kcal
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-ink-faint hover:text-red-500 transition p-1 shrink-0"
                        aria-label="Eintrag löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Mobile FAB — 56px, above bottom nav, z-50 */}
      <button
        onClick={openForm}
        className="md:hidden fixed right-5 bottom-[calc(5rem+env(safe-area-inset-bottom,0))] z-50 w-14 h-14 bg-primary hover:bg-primary-hover text-white rounded-full shadow-pop flex items-center justify-center transition hover:scale-105 active:scale-95"
        aria-label="Mahlzeit eintragen"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add entry sheet / modal */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-ink/40 animate-fade-in"
            onClick={() => !saving && setShowForm(false)}
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-card animate-slide-in-up sm:mb-0">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="font-serif text-xl text-ink">
                Eintrag hinzufügen
              </h2>
              <button
                onClick={() => !saving && setShowForm(false)}
                className="text-ink-muted hover:text-ink transition p-1"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 pb-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-2">
                  Mahlzeit
                </label>
                <div className="flex gap-2 flex-wrap">
                  {MAHLZEIT_TYPEN.map((t) => {
                    const style = MEAL_STYLES[t.value as MealTyp];
                    const Icon = style.icon;
                    const active = formTyp === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setFormTyp(t.value as MealTyp)}
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${
                          active
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-ink-muted border-border hover:border-primary/40"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-2">
                  Was hast du gegessen?
                </label>
                <textarea
                  value={formBeschreibung}
                  onChange={(e) => setFormBeschreibung(e.target.value)}
                  rows={3}
                  className="w-full border border-border rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none bg-surface-bg"
                  placeholder="z.B. Haferflocken mit Beeren und Joghurt"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-2">
                    Kalorien (optional)
                  </label>
                  <input
                    type="number"
                    value={formKcal}
                    onChange={(e) => setFormKcal(e.target.value)}
                    className="w-full border border-border rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-surface-bg"
                    placeholder="ca. 350"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-2">
                    Uhrzeit
                  </label>
                  <input
                    type="time"
                    value={formUhrzeit}
                    onChange={(e) => setFormUhrzeit(e.target.value)}
                    className="w-full border border-border rounded-2xl px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-surface-bg"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="flex-1 text-sm text-ink-muted py-3 rounded-full border border-border hover:bg-surface-muted transition"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!formBeschreibung.trim() || saving}
                  className="flex-1 text-sm font-medium text-white bg-primary py-3 rounded-full hover:bg-primary-hover transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
