"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WeightChart } from "@/components/tracker/weight-chart";
import { WeightLog } from "@/types";
import { Plus, Trash2, Loader2, Scale } from "lucide-react";

export default function GewichtPage() {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gewicht, setGewicht] = useState("");
  const [notiz, setNotiz] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [deleting, setDeleting] = useState<string | null>(null);

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
      loadLogs();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/tracker/gewicht/${id}`, { method: "DELETE" });
    setDeleting(null);
    loadLogs();
  }

  const latest = logs.length > 0 ? logs[logs.length - 1] : null;
  const previous = logs.length > 1 ? logs[logs.length - 2] : null;
  const diff =
    latest && previous
      ? (latest.gewicht_kg - previous.gewicht_kg).toFixed(1)
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Gewichtstracker
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Trage regelmäßig dein Gewicht ein um deinen Verlauf zu sehen.
        </p>

        {/* Stats */}
        {latest && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">Aktuell</p>
              <p className="text-xl font-bold text-gray-800">
                {latest.gewicht_kg} kg
              </p>
            </div>
            {diff && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 mb-1">Veränderung</p>
                <p
                  className={`text-xl font-bold ${
                    parseFloat(diff) < 0 ? "text-primary" : parseFloat(diff) > 0 ? "text-accent-warm" : "text-gray-800"
                  }`}
                >
                  {parseFloat(diff) > 0 ? "+" : ""}
                  {diff} kg
                </p>
              </div>
            )}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">Einträge</p>
              <p className="text-xl font-bold text-gray-800">{logs.length}</p>
            </div>
          </div>
        )}

        {/* Chart */}
        {!loading && <WeightChart data={logs} />}

        {/* Add Entry */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-100 p-5 mt-6"
        >
          <h3 className="font-semibold text-gray-800 text-sm mb-3">
            Neuer Eintrag
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Datum</label>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Notiz (optional)
              </label>
              <input
                type="text"
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                placeholder="z.B. nach dem Sport"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !gewicht}
            className="mt-3 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Eintragen
          </button>
        </form>

        {/* History */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-6">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Verlauf</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Scale className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Noch keine Einträge.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...logs].reverse().map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between px-3 py-2.5 bg-surface-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">
                      {log.gewicht_kg} kg
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.gemessen_am).toLocaleDateString("de-DE")}
                    </span>
                    {log.notiz && (
                      <span className="text-xs text-gray-400 italic">
                        {log.notiz}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(log.id)}
                    disabled={deleting === log.id}
                    className="text-gray-400 hover:text-red-500 transition p-1"
                  >
                    {deleting === log.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
