"use client";

import { useState, useEffect } from "react";
import { FoodLog, MAHLZEIT_TYPEN } from "@/types";
import { Plus, Trash2, Loader2, UtensilsCrossed, Flame } from "lucide-react";

interface Props {
  initialEntries: FoodLog[];
  today: string;
}

export function TagebuchClient({ initialEntries, today }: Props) {
  const [datum, setDatum] = useState(today);
  const [entries, setEntries] = useState<FoodLog[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTyp, setFormTyp] = useState("fruehstueck");
  const [formBeschreibung, setFormBeschreibung] = useState("");
  const [formKcal, setFormKcal] = useState("");

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

  // Total kcal
  const entriesWithKcal = entries.filter((e) => e.kalorien_geschaetzt);
  const totalKcal = entriesWithKcal.reduce(
    (sum, e) => sum + (e.kalorien_geschaetzt || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Date picker + summary */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        {entriesWithKcal.length > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg">
            <Flame className="w-4 h-4" />
            <span className="text-sm font-medium">{totalKcal} kcal</span>
            <span className="text-xs text-orange-400">heute</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          {/* Meal sections */}
          {grouped.map((group) => (
            <div key={group.value}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">
                  {group.label}
                </h3>
                {group.items.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {group.items.filter((i) => i.kalorien_geschaetzt).reduce((s, i) => s + (i.kalorien_geschaetzt || 0), 0)} kcal
                  </span>
                )}
              </div>

              {group.items.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400">Noch kein Eintrag</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {group.items.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white rounded-xl border border-gray-100 p-3 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">
                          {entry.beschreibung}
                        </p>
                        {entry.kalorien_geschaetzt && (
                          <p className="text-xs text-gray-400 mt-1">
                            ~{entry.kalorien_geschaetzt} kcal
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-gray-300 hover:text-red-400 transition p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Add button */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 text-sm text-primary bg-primary-bg hover:bg-primary-pale py-3 rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              Eintrag hinzufügen
            </button>
          )}

          {/* Add form */}
          {showForm && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Mahlzeit
                </label>
                <div className="flex gap-2 flex-wrap">
                  {MAHLZEIT_TYPEN.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setFormTyp(t.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        formTyp === t.value
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-600 border-gray-200 hover:border-primary/30"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Was hast du gegessen?
                </label>
                <textarea
                  value={formBeschreibung}
                  onChange={(e) => setFormBeschreibung(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  placeholder="z.B. Haferflocken mit Beeren und Joghurt"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Kalorien (optional)
                </label>
                <input
                  type="number"
                  value={formKcal}
                  onChange={(e) => setFormKcal(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="ca. 350"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 text-sm text-gray-500 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!formBeschreibung.trim() || saving}
                  className="flex-1 text-sm text-white bg-primary py-2 rounded-lg hover:bg-primary-light transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UtensilsCrossed className="w-4 h-4" />
                  )}
                  Speichern
                </button>
              </div>
            </div>
          )}

          {/* Empty state for whole day */}
          {entries.length === 0 && !showForm && (
            <div className="text-center py-6 text-gray-400">
              <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Noch keine Einträge für diesen Tag.</p>
              <p className="text-xs mt-1">
                Trage ein, was du gegessen hast.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
