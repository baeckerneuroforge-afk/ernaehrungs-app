"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Ziel } from "@/types";
import {
  Target,
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  X,
} from "lucide-react";

export default function ZielePage() {
  const [ziele, setZiele] = useState<Ziel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);

  // Form state
  const [typ, setTyp] = useState<"gewicht" | "kalorien" | "custom">("gewicht");
  const [beschreibung, setBeschreibung] = useState("");
  const [zielwert, setZielwert] = useState("");
  const [startwert, setStartwert] = useState("");
  const [einheit, setEinheit] = useState("kg");
  const [zieldatum, setZieldatum] = useState("");

  const loadData = useCallback(async () => {
    const [zieleRes, weightRes] = await Promise.all([
      fetch("/api/tracker/ziele"),
      fetch("/api/tracker/gewicht"),
    ]);
    if (zieleRes.ok) setZiele(await zieleRes.json());
    if (weightRes.ok) {
      const weights = await weightRes.json();
      if (weights.length > 0) {
        setLatestWeight(weights[weights.length - 1].gewicht_kg);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!beschreibung) return;
    setSaving(true);

    const res = await fetch("/api/tracker/ziele", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typ,
        beschreibung,
        zielwert: zielwert ? parseFloat(zielwert) : null,
        startwert: startwert ? parseFloat(startwert) : null,
        einheit: typ === "custom" ? einheit : typ === "gewicht" ? "kg" : "kcal",
        zieldatum: zieldatum || null,
      }),
    });

    if (res.ok) {
      setBeschreibung("");
      setZielwert("");
      setStartwert("");
      setZieldatum("");
      setShowForm(false);
      loadData();
    }
    setSaving(false);
  }

  async function handleToggle(ziel: Ziel) {
    await fetch(`/api/tracker/ziele/${ziel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        erreicht: !ziel.erreicht,
        erreicht_am: !ziel.erreicht
          ? new Date().toISOString().split("T")[0]
          : null,
      }),
    });
    loadData();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/tracker/ziele/${id}`, { method: "DELETE" });
    setDeleting(null);
    loadData();
  }

  function getProgress(ziel: Ziel): number | null {
    if (!ziel.startwert || !ziel.zielwert) return null;
    let current = ziel.startwert;
    if (ziel.typ === "gewicht" && latestWeight) current = latestWeight;
    const total = Math.abs(ziel.zielwert - ziel.startwert);
    if (total === 0) return 100;
    const done = Math.abs(current - ziel.startwert);
    return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
  }

  function getCurrent(ziel: Ziel): number | null {
    if (ziel.typ === "gewicht" && latestWeight) return latestWeight;
    return ziel.startwert ?? null;
  }

  const activeZiele = ziele.filter((z) => !z.erreicht);
  const doneZiele = ziele.filter((z) => z.erreicht);

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl text-ink">Ziele</h1>
            <p className="text-ink-muted text-sm mt-1">
              Setze dir Ziele und verfolge deinen Fortschritt.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-full text-sm font-medium transition"
          >
            {showForm ? (
              <X className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {showForm ? "Abbrechen" : "Neues Ziel"}
          </button>
        </div>

        {/* New Goal Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-border p-5 mb-6 animate-slide-in-up"
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs text-ink-muted mb-1.5 block">Typ</label>
                <div className="flex gap-2">
                  {[
                    { v: "gewicht" as const, l: "Gewicht" },
                    { v: "kalorien" as const, l: "Kalorien" },
                    { v: "custom" as const, l: "Eigenes" },
                  ].map((t) => (
                    <button
                      key={t.v}
                      type="button"
                      onClick={() => {
                        setTyp(t.v);
                        setEinheit(
                          t.v === "gewicht"
                            ? "kg"
                            : t.v === "kalorien"
                              ? "kcal"
                              : ""
                        );
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                        typ === t.v
                          ? "bg-primary text-white"
                          : "bg-surface-muted text-ink-muted hover:bg-primary-faint"
                      }`}
                    >
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-ink-muted mb-1.5 block">
                  Beschreibung
                </label>
                <input
                  type="text"
                  value={beschreibung}
                  onChange={(e) => setBeschreibung(e.target.value)}
                  placeholder={
                    typ === "gewicht"
                      ? "z.B. Zielgewicht 68 kg erreichen"
                      : typ === "kalorien"
                        ? "z.B. Maximal 1800 kcal pro Tag"
                        : "z.B. 3x pro Woche Gemüse kochen"
                  }
                  required
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-ink-muted mb-1.5 block">
                    Startwert
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={startwert}
                    onChange={(e) => setStartwert(e.target.value)}
                    placeholder={
                      typ === "gewicht" && latestWeight
                        ? String(latestWeight)
                        : ""
                    }
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted mb-1.5 block">
                    Zielwert
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={zielwert}
                    onChange={(e) => setZielwert(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  />
                </div>
                {typ === "custom" && (
                  <div>
                    <label className="text-xs text-ink-muted mb-1.5 block">
                      Einheit
                    </label>
                    <input
                      type="text"
                      value={einheit}
                      onChange={(e) => setEinheit(e.target.value)}
                      placeholder="z.B. Mal"
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs text-ink-muted mb-1.5 block">
                    Zieldatum
                  </label>
                  <input
                    type="date"
                    value={zieldatum}
                    onChange={(e) => setZieldatum(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !beschreibung}
              className="mt-5 flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Ziel erstellen
            </button>
          </form>
        )}

        {/* Active Goals */}
        <div className="mb-6">
          <h3 className="font-serif text-lg text-ink mb-4">
            Aktive Ziele{" "}
            <span className="text-ink-faint text-sm">({activeZiele.length})</span>
          </h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
            </div>
          ) : activeZiele.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-primary-pale flex items-center justify-center mx-auto mb-3">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-ink-muted">
                Noch keine Ziele gesetzt. Starte mit deinem ersten Ziel.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeZiele.map((ziel) => {
                const progress = getProgress(ziel);
                const current = getCurrent(ziel);
                return (
                  <div
                    key={ziel.id}
                    className="bg-white rounded-2xl border border-border p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          onClick={() => handleToggle(ziel)}
                          className="mt-0.5 w-5 h-5 rounded-full border-2 border-border hover:border-primary transition flex-shrink-0"
                          aria-label="Als erreicht markieren"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink">
                            {ziel.beschreibung}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            {ziel.zieldatum && (
                              <span className="text-xs text-ink-faint">
                                bis{" "}
                                {new Date(ziel.zieldatum).toLocaleDateString(
                                  "de-DE"
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(ziel.id)}
                        disabled={deleting === ziel.id}
                        className="text-ink-faint hover:text-red-500 transition p-1 flex-shrink-0"
                        aria-label="Löschen"
                      >
                        {deleting === ziel.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {progress !== null && (
                      <div>
                        <div className="flex justify-between items-baseline text-xs mb-1.5">
                          <span className="text-ink-muted">
                            <span className="font-semibold text-ink">
                              {current} {ziel.einheit}
                            </span>
                            <span className="text-ink-faint">
                              {" "}
                              / {ziel.zielwert} {ziel.einheit}
                            </span>
                          </span>
                          <span className="font-semibold text-primary">
                            {progress}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed Goals */}
        {doneZiele.length > 0 && (
          <div>
            <h3 className="font-serif text-lg text-ink mb-4">
              Erreicht{" "}
              <span className="text-ink-faint text-sm">({doneZiele.length})</span>
            </h3>
            <div className="space-y-2">
              {doneZiele.map((ziel) => (
                <div
                  key={ziel.id}
                  className="flex items-center justify-between bg-primary-faint border border-primary-pale rounded-2xl px-4 py-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-ink-muted line-through truncate">
                      {ziel.beschreibung}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(ziel.id)}
                    className="text-ink-faint hover:text-red-500 transition p-1 flex-shrink-0"
                    aria-label="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
