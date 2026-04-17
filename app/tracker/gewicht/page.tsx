"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WeightChart } from "@/components/tracker/weight-chart";
import { WeightLog } from "@/types";
import {
  Plus,
  Trash2,
  Loader2,
  Scale,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

export default function GewichtPage() {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gewicht, setGewicht] = useState("");
  const [notiz, setNotiz] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadLogs = useCallback(async () => {
    const res = await fetch("/api/tracker/gewicht");
    if (res.ok) setLogs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gewicht) return;
    setSaving(true);

    const res = await fetch("/api/tracker/gewicht", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gewicht_kg: parseFloat(gewicht),
        notiz: notiz || null,
        gemessen_am: datum,
      }),
    });

    if (res.ok) {
      setGewicht("");
      setNotiz("");
      setDatum(new Date().toISOString().split("T")[0]);
      setModalOpen(false);
      loadLogs();
      toast.success("Gewicht eingetragen");
    } else {
      toast.error("Speichern fehlgeschlagen");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/tracker/gewicht/${id}`, { method: "DELETE" });
    setDeleting(null);
    loadLogs();
    if (res.ok) {
      toast.success("Eintrag gelöscht");
    } else {
      toast.error("Löschen fehlgeschlagen");
    }
  }

  const latest = logs.length > 0 ? logs[logs.length - 1] : null;
  const previous = logs.length > 1 ? logs[logs.length - 2] : null;
  const diff =
    latest && previous
      ? (latest.gewicht_kg - previous.gewicht_kg).toFixed(1)
      : null;
  const diffNum = diff ? parseFloat(diff) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full animate-fade-in">
        <h1 className="font-serif text-3xl text-ink mb-2">Gewichtstracker</h1>
        <p className="text-ink-muted text-sm mb-6">
          Trage regelmäßig dein Gewicht ein um deinen Verlauf zu sehen.
        </p>

        {/* Stats */}
        {latest && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-2xl border border-border p-4">
              <p className="text-xs text-ink-faint mb-1">Aktuell</p>
              <p className="text-xl font-serif text-ink">
                {latest.gewicht_kg}
                <span className="text-sm text-ink-muted ml-1">kg</span>
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-4">
              <p className="text-xs text-ink-faint mb-1">Veränderung</p>
              {diff ? (
                <p
                  className={`text-xl font-serif flex items-center gap-1 ${
                    diffNum < 0
                      ? "text-primary"
                      : diffNum > 0
                        ? "text-amber-600"
                        : "text-ink"
                  }`}
                >
                  {diffNum < 0 ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : diffNum > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : null}
                  {diffNum > 0 ? "+" : ""}
                  {diff}
                </p>
              ) : (
                <p className="text-xl font-serif text-ink-faint">–</p>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-border p-4">
              <p className="text-xs text-ink-faint mb-1">Einträge</p>
              <p className="text-xl font-serif text-ink">{logs.length}</p>
            </div>
          </div>
        )}

        {/* Chart */}
        {!loading && logs.length >= 2 && (
          <div className="mb-6">
            <WeightChart data={logs} />
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <h3 className="font-serif text-lg text-ink mb-4">Verlauf</h3>
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-sm text-ink-muted">
                Gewichte werden geladen …
              </p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-primary-pale flex items-center justify-center mx-auto mb-3">
                <Scale className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-ink-muted">
                Noch keine Einträge. Starte mit deinem ersten Gewicht.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...logs].reverse().map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between px-4 py-3 bg-surface-muted rounded-xl hover:bg-primary-faint transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-semibold text-ink">
                      {log.gewicht_kg} kg
                    </span>
                    <span className="text-xs text-ink-faint">
                      {new Date(log.gemessen_am).toLocaleDateString("de-DE")}
                    </span>
                    {log.notiz && (
                      <span className="text-xs text-ink-muted italic truncate">
                        {log.notiz}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(log.id)}
                    disabled={deleting === log.id}
                    className="text-ink-faint hover:text-red-500 transition p-1 flex-shrink-0"
                    aria-label="Löschen"
                  >
                    {deleting === log.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* FAB */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-24 md:bottom-6 right-6 z-40 bg-primary hover:bg-primary-hover text-white rounded-full shadow-lg p-4 transition-all hover:-translate-y-0.5"
        aria-label="Neuen Eintrag hinzufügen"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal / Bottom Sheet */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-card animate-slide-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-ink">Neuer Eintrag</h3>
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
                  min="30"
                  max="300"
                  value={gewicht}
                  onChange={(e) => setGewicht(e.target.value)}
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
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">
                  Notiz (optional)
                </label>
                <input
                  type="text"
                  value={notiz}
                  onChange={(e) => setNotiz(e.target.value)}
                  placeholder="z.B. nach dem Sport"
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !gewicht}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-3 rounded-full text-sm font-medium transition disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Eintragen
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
