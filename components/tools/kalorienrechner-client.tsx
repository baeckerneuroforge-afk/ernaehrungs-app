"use client";

import { useState, useMemo } from "react";
import { GESCHLECHT, AKTIVITAET } from "@/types";
import { Flame, Activity, Target } from "lucide-react";

interface Props {
  prefill: {
    alter_jahre?: number | null;
    geschlecht?: string | null;
    groesse_cm?: number | null;
    gewicht_kg?: number | null;
    aktivitaet?: string | null;
    ziel?: string | null;
  } | null;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  wenig: 1.2,
  moderat: 1.375,
  aktiv: 1.55,
  sehr_aktiv: 1.725,
};

const ZIEL_LABELS: Record<string, string> = {
  abnehmen: "Abnehmen (–500 kcal)",
  zunehmen: "Zunehmen (+300 kcal)",
  muskelaufbau: "Muskelaufbau (+300 kcal)",
  halten: "Gewicht halten",
  gesuender: "Gesünder ernähren",
};

export function KalorienrechnerClient({ prefill }: Props) {
  const [gewicht, setGewicht] = useState(prefill?.gewicht_kg ?? "");
  const [groesse, setGroesse] = useState(prefill?.groesse_cm ?? "");
  const [alter, setAlter] = useState(prefill?.alter_jahre ?? "");
  const [geschlecht, setGeschlecht] = useState(prefill?.geschlecht ?? "weiblich");
  const [aktivitaet, setAktivitaet] = useState(prefill?.aktivitaet ?? "moderat");
  const [ziel, setZiel] = useState(prefill?.ziel ?? "halten");

  const result = useMemo(() => {
    const w = Number(gewicht);
    const h = Number(groesse);
    const a = Number(alter);
    if (!w || !h || !a) return null;

    // Mifflin-St Jeor
    let bmr: number;
    if (geschlecht === "maennlich") {
      bmr = 10 * w + 6.25 * h - 5 * a + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * a - 161;
    }

    const multiplier = ACTIVITY_MULTIPLIERS[aktivitaet] ?? 1.375;
    const tdee = bmr * multiplier;

    let zielKcal = tdee;
    if (ziel === "abnehmen") zielKcal = tdee - 500;
    else if (ziel === "zunehmen" || ziel === "muskelaufbau") zielKcal = tdee + 300;

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      zielKcal: Math.round(zielKcal),
    };
  }, [gewicht, groesse, alter, geschlecht, aktivitaet, ziel]);

  return (
    <div className="space-y-8">
      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Deine Daten</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Gewicht (kg)</label>
            <input
              type="number"
              value={gewicht}
              onChange={(e) => setGewicht(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="70"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Größe (cm)</label>
            <input
              type="number"
              value={groesse}
              onChange={(e) => setGroesse(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="170"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Alter (Jahre)</label>
            <input
              type="number"
              value={alter}
              onChange={(e) => setAlter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="30"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Geschlecht</label>
            <div className="flex gap-2">
              {GESCHLECHT.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGeschlecht(g.value)}
                  className={`flex-1 text-sm py-2 rounded-lg border transition ${
                    geschlecht === g.value
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary/30"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Aktivitätslevel</label>
            <select
              value={aktivitaet}
              onChange={(e) => setAktivitaet(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {AKTIVITAET.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Ziel</label>
            <select
              value={ziel}
              onChange={(e) => setZiel(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {Object.entries(ZIEL_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {result ? (
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <p className="text-xs text-gray-400 mb-1">Grundumsatz (BMR)</p>
            <p className="text-3xl font-bold text-gray-800">{result.bmr}</p>
            <p className="text-xs text-gray-400 mt-1">kcal / Tag</p>
            <p className="text-xs text-gray-400 mt-2">Kalorien im Ruhezustand</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <Activity className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-xs text-gray-400 mb-1">Gesamtumsatz (TDEE)</p>
            <p className="text-3xl font-bold text-gray-800">{result.tdee}</p>
            <p className="text-xs text-gray-400 mt-1">kcal / Tag</p>
            <p className="text-xs text-gray-400 mt-2">mit deiner Aktivität</p>
          </div>

          <div className="bg-white rounded-2xl border border-primary/20 p-6 text-center bg-primary-bg/30">
            <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <p className="text-xs text-gray-400 mb-1">Empfehlung</p>
            <p className="text-3xl font-bold text-primary">{result.zielKcal}</p>
            <p className="text-xs text-gray-400 mt-1">kcal / Tag</p>
            <p className="text-xs text-gray-400 mt-2">
              {ZIEL_LABELS[ziel] || "für dein Ziel"}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          <p className="text-sm">Fülle die Felder oben aus, um dein Ergebnis zu sehen.</p>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Berechnung basiert auf der Mifflin-St Jeor Formel. Die Werte sind Richtwerte –
        besprich individuelle Anpassungen mit deiner Ernährungsberaterin.
      </p>
    </div>
  );
}
