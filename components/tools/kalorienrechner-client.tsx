"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { GESCHLECHT, AKTIVITAET } from "@/types";
import { Flame, Activity, Target, Check, Lock } from "lucide-react";
import Link from "next/link";

interface Props {
  prefill: {
    alter_jahre?: number | null;
    geschlecht?: string | null;
    groesse_cm?: number | null;
    gewicht_kg?: number | null;
    aktivitaet?: string | null;
    ziel?: string | null;
    calorie_adjustment?: number | null;
  } | null;
  gewichtsZiel?: {
    typ?: string | null;
    beschreibung?: string | null;
    zielwert?: number | null;
    startwert?: number | null;
    einheit?: string | null;
    zieldatum?: string | null;
  } | null;
  hasBasisOrHigher?: boolean;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  wenig: 1.2,
  moderat: 1.375,
  aktiv: 1.55,
  sehr_aktiv: 1.725,
};

const ZIEL_LABELS: Record<string, string> = {
  abnehmen: "Abnehmen",
  zunehmen: "Zunehmen",
  muskelaufbau: "Muskelaufbau",
  halten: "Gewicht halten",
  gesuender: "Gesünder ernähren",
};

function defaultAdjustmentForZiel(ziel: string): number {
  if (ziel === "abnehmen") return -500;
  if (ziel === "zunehmen" || ziel === "muskelaufbau") return 300;
  return 0;
}

export function KalorienrechnerClient({ prefill, gewichtsZiel, hasBasisOrHigher = false }: Props) {
  // Ableiten aus aktivem Gewichtsziel, falls User noch keinen eigenen Wert
  // gespeichert hat. Richtung: zielwert < aktuelles Gewicht → abnehmen.
  const derivedFromGoal = (() => {
    const current = prefill?.gewicht_kg;
    const target = gewichtsZiel?.zielwert;
    if (!current || !target) return null;
    if (target < current) return { adjustment: -500, ziel: "abnehmen" };
    if (target > current) return { adjustment: 300, ziel: "zunehmen" };
    return { adjustment: 0, ziel: "halten" };
  })();

  const initialZiel =
    prefill?.calorie_adjustment != null
      ? (prefill?.ziel ?? "halten")
      : derivedFromGoal?.ziel ?? prefill?.ziel ?? "halten";
  const initialAdjustment =
    prefill?.calorie_adjustment ??
    derivedFromGoal?.adjustment ??
    defaultAdjustmentForZiel(initialZiel);

  const [gewicht, setGewicht] = useState(prefill?.gewicht_kg ?? "");
  const [groesse, setGroesse] = useState(prefill?.groesse_cm ?? "");
  const [alter, setAlter] = useState(prefill?.alter_jahre ?? "");
  const [geschlecht, setGeschlecht] = useState(prefill?.geschlecht ?? "weiblich");
  const [aktivitaet, setAktivitaet] = useState(prefill?.aktivitaet ?? "moderat");
  const [ziel, setZiel] = useState(initialZiel);
  const [adjustment, setAdjustment] = useState<number>(initialAdjustment);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Wenn der Nutzer das Ziel wechselt, setze das Delta auf den Default
  // dieses Ziels zurueck — sonst wirkt die UI "kaputt". Erst-Run ueberspringen,
  // damit ein gespeicherter oder aus dem Gewichtsziel abgeleiteter Initialwert
  // nicht gleich ueberschrieben wird.
  const skipZielEffect = useRef(true);
  useEffect(() => {
    if (skipZielEffect.current) {
      skipZielEffect.current = false;
      return;
    }
    setAdjustment(defaultAdjustmentForZiel(ziel));
    setSaved(false);
  }, [ziel]);

  const result = useMemo(() => {
    const w = Number(gewicht);
    const h = Number(groesse);
    const a = Number(alter);
    if (!w || !h || !a) return null;

    let bmr: number;
    if (geschlecht === "maennlich") {
      bmr = 10 * w + 6.25 * h - 5 * a + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * a - 161;
    }

    const multiplier = ACTIVITY_MULTIPLIERS[aktivitaet] ?? 1.375;
    const tdee = bmr * multiplier;
    const zielKcal = tdee + adjustment;

    // kg/Woche: 7700 kcal ≈ 1 kg Fett
    const kgPerWeek = (adjustment * 7) / 7700;

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      zielKcal: Math.round(zielKcal),
      kgPerWeek: Math.round(kgPerWeek * 100) / 100,
    };
  }, [gewicht, groesse, alter, geschlecht, aktivitaet, adjustment]);

  // Warnungen
  const warning = useMemo(() => {
    if (!result) return null;
    if (result.zielKcal < 1200) {
      return {
        tone: "red" as const,
        text: "Unter 1.200 kcal pro Tag ist gesundheitlich bedenklich. Bitte erhöhe dein Kalorienziel oder sprich mit einem Arzt.",
      };
    }
    if (adjustment < -1000) {
      return {
        tone: "red" as const,
        text: "Ein Defizit über 1.000 kcal ist nicht empfehlenswert und kann zu Muskelabbau, Nährstoffmangel und Jo-Jo-Effekt führen. Besprich das bitte mit einem Arzt.",
      };
    }
    if (adjustment < -750) {
      return {
        tone: "amber" as const,
        text: "Ein hohes Defizit von über 750 kcal kann kurzfristig funktionieren, ist aber langfristig schwer durchzuhalten. Empfohlen: 500 kcal.",
      };
    }
    if (adjustment >= -750 && adjustment <= -300) {
      return {
        tone: "green" as const,
        text: "Moderates Defizit — nachhaltig und gesund.",
      };
    }
    if (adjustment > 1000) {
      return {
        tone: "red" as const,
        text: "Ein Überschuss über 1.000 kcal führt hauptsächlich zu Fetteinlagerung, nicht zu Muskelaufbau. Empfohlen: 300–500 kcal.",
      };
    }
    if (adjustment > 500) {
      return {
        tone: "amber" as const,
        text: "Ein hoher Überschuss kann zu übermäßiger Fettzunahme führen. Für Muskelaufbau reichen 300–500 kcal.",
      };
    }
    if (adjustment >= 200 && adjustment <= 500) {
      return {
        tone: "green" as const,
        text: "Moderater Überschuss — ideal für sauberen Muskelaufbau.",
      };
    }
    if (adjustment > -300 && adjustment < 200) {
      return {
        tone: "green" as const,
        text: "Kalorienbedarf — gut für Gewicht halten.",
      };
    }
    return null;
  }, [result, adjustment]);

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calorie_target: result.zielKcal,
          calorie_adjustment: adjustment,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data?.message || "Speichern fehlgeschlagen.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setSaving(false);
    }
  }

  // Info-Banner: Zielgewicht existiert, aktuelles Gewicht bekannt.
  // "Aktuelles Gewicht" kommt live aus dem Formular (falls User dort etwas
  // getippt hat), sonst aus dem Profil.
  const currentWeight = Number(gewicht) || prefill?.gewicht_kg || null;
  const goalDelta =
    gewichtsZiel?.zielwert && currentWeight
      ? Math.abs(currentWeight - gewichtsZiel.zielwert)
      : null;

  // Zeitplan-Berechnung (nur bei Gewichtsziel mit Zieldatum)
  const zeitplan = (() => {
    if (
      !gewichtsZiel?.zieldatum ||
      !gewichtsZiel?.zielwert ||
      !currentWeight ||
      (gewichtsZiel.typ && gewichtsZiel.typ !== "gewicht")
    ) {
      return null;
    }

    const heute = new Date();
    heute.setHours(0, 0, 0, 0);
    const zielDatum = new Date(gewichtsZiel.zieldatum);
    const tageUebrig = Math.max(
      1,
      Math.round((zielDatum.getTime() - heute.getTime()) / 86400000),
    );
    const wochenUebrig = tageUebrig / 7;

    // positiv = abnehmen, negativ = zunehmen
    const gewichtDifferenz = currentWeight - gewichtsZiel.zielwert;
    if (gewichtDifferenz === 0) return null;

    const richtung: "abnehmen" | "zunehmen" =
      gewichtDifferenz > 0 ? "abnehmen" : "zunehmen";
    const benoetigtProWoche = gewichtDifferenz / wochenUebrig; // kg/Woche, signed
    const benoetigtDefizitProTag = Math.round(
      (Math.abs(benoetigtProWoche) * 7700) / 7,
    );

    // User-Input muss in die richtige Richtung zeigen (Defizit beim Abnehmen,
    // Ueberschuss beim Zunehmen), sonst Infinity.
    const userMagnitude =
      (richtung === "abnehmen" && adjustment < 0) ||
      (richtung === "zunehmen" && adjustment > 0)
        ? Math.abs(adjustment)
        : 0;
    const userProWoche = (userMagnitude * 7) / 7700;
    const benoetigteWochen =
      userProWoche > 0 ? Math.abs(gewichtDifferenz) / userProWoche : Infinity;

    const geschaetztDatum =
      Number.isFinite(benoetigteWochen)
        ? new Date(heute.getTime() + benoetigteWochen * 7 * 86400000)
        : null;

    const differenzTage =
      geschaetztDatum != null
        ? Math.round(
            (geschaetztDatum.getTime() - zielDatum.getTime()) / 86400000,
          )
        : null;

    return {
      richtung,
      benoetigtDefizitProTag,
      benoetigtProWoche: Math.abs(benoetigtProWoche),
      geschaetztDatum,
      differenzTage,
      zielDatum,
      istZuAggressiv: benoetigtDefizitProTag > 1000,
    };
  })();

  return (
    <div className="space-y-8">
      {gewichtsZiel?.zielwert && (
        <div className="flex items-start gap-2 text-sm bg-primary-bg/40 border border-primary/20 rounded-xl px-4 py-3">
          <span>🎯</span>
          <span className="text-ink">
            Dein Ziel: <strong>{gewichtsZiel.zielwert} kg</strong> erreichen
            {goalDelta != null && goalDelta > 0 && (
              <> (noch {goalDelta.toFixed(1).replace(".", ",")} kg)</>
            )}
            {" — "}Kalorienrechner ist darauf eingestellt.
          </span>
        </div>
      )}

      {hasBasisOrHigher && zeitplan && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-800">Dein Zeitplan</span>
            <span className="text-xs text-gray-500">
              Ziel: {gewichtsZiel!.zielwert} kg bis{" "}
              {zeitplan.zielDatum.toLocaleDateString("de-DE")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">
                Benötigter{" "}
                {zeitplan.richtung === "abnehmen" ? "Defizit" : "Überschuss"}:
              </span>
              <span className="font-semibold text-gray-800 ml-1">
                {zeitplan.benoetigtDefizitProTag} kcal/Tag
              </span>
            </div>
            <div>
              <span className="text-gray-500">
                Dein{" "}
                {zeitplan.richtung === "abnehmen" ? "Defizit" : "Überschuss"}:
              </span>
              <span className="font-semibold text-gray-800 ml-1">
                {Math.abs(adjustment)} kcal/Tag
              </span>
            </div>
          </div>

          <div className="text-sm">
            <span className="text-gray-500">
              Geschätztes Erreichen mit aktuellem{" "}
              {zeitplan.richtung === "abnehmen" ? "Defizit" : "Überschuss"}:{" "}
            </span>
            {zeitplan.geschaetztDatum ? (
              <>
                <span className="font-semibold text-primary">
                  {zeitplan.geschaetztDatum.toLocaleDateString("de-DE")}
                </span>
                {zeitplan.differenzTage != null && zeitplan.differenzTage > 0 && (
                  <span className="text-amber-600 ml-1">
                    ({zeitplan.differenzTage} Tage später als geplant)
                  </span>
                )}
                {zeitplan.differenzTage != null && zeitplan.differenzTage < 0 && (
                  <span className="text-green-600 ml-1">
                    ({Math.abs(zeitplan.differenzTage)} Tage früher als geplant)
                  </span>
                )}
                {zeitplan.differenzTage === 0 && (
                  <span className="text-green-600 ml-1">(genau im Plan)</span>
                )}
              </>
            ) : (
              <span className="font-semibold text-amber-600">
                {zeitplan.richtung === "abnehmen"
                  ? "Dein aktueller Wert ist kein Defizit — Ziel wird so nicht erreicht."
                  : "Dein aktueller Wert ist kein Überschuss — Ziel wird so nicht erreicht."}
              </span>
            )}
          </div>

          {zeitplan.istZuAggressiv && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              ⚠️ Um dein Ziel bis zum{" "}
              {zeitplan.zielDatum.toLocaleDateString("de-DE")} zu erreichen,
              wäre ein{" "}
              {zeitplan.richtung === "abnehmen" ? "Defizit" : "Überschuss"} von{" "}
              {zeitplan.benoetigtDefizitProTag} kcal/Tag nötig — das ist zu
              aggressiv. Ein nachhaltiger Wert von 500–750 kcal ist gesünder.
              Das Datum verschiebt sich dann etwas, aber du bleibst langfristig
              dran.
            </div>
          )}

          <p className="text-xs text-gray-500">
            Schneller ist nicht immer besser — nachhaltiger Gewichtsverlust
            liegt bei 0,5–1 kg pro Woche. Sprich gerne im Chat über konkrete
            Umsetzungen oder erstelle dir einen passenden Ernährungsplan.
          </p>
        </div>
      )}

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

      {/* Adjustment + Result */}
      {result ? (
        <>
          {/* Quick-Select + Slider — gated for paid users */}
          {hasBasisOrHigher ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">Deine Anpassung</h2>
              <div className="grid sm:grid-cols-3 gap-2 mb-6">
                {[
                  { value: -500, label: "Abnehmen", sub: "−500 kcal (empfohlen)" },
                  { value: 0, label: "Halten", sub: "±0 kcal" },
                  { value: 300, label: "Zunehmen", sub: "+300 kcal (empfohlen)" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAdjustment(opt.value)}
                    className={`text-left p-3 rounded-xl border transition ${
                      adjustment === opt.value
                        ? "border-primary bg-primary-bg/40"
                        : "border-gray-200 hover:border-primary/30"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>

              {/* Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-600">Oder individuell anpassen:</label>
                  <span className={`text-sm font-semibold ${adjustment < 0 ? "text-red-600" : adjustment > 0 ? "text-green-600" : "text-gray-700"}`}>
                    {adjustment > 0 ? "+" : ""}{adjustment} kcal
                  </span>
                </div>
                <input
                  type="range"
                  min={-1500}
                  max={1500}
                  step={50}
                  value={adjustment}
                  onChange={(e) => { setAdjustment(Number(e.target.value)); setSaved(false); }}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>−1500</span>
                  <span>0</span>
                  <span>+1500</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={-1500}
                    max={1500}
                    step={50}
                    value={adjustment}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) setAdjustment(Math.max(-1500, Math.min(1500, n)));
                      setSaved(false);
                    }}
                    className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <span className="text-xs text-gray-500">kcal Abweichung vom Gesamtumsatz</span>
                </div>
              </div>
            </div>
          ) : (
            /* Gate overlay for free users */
            <div className="relative bg-white rounded-2xl border border-gray-100 p-6 overflow-hidden">
              {/* Blurred preview */}
              <div className="pointer-events-none select-none blur-[2px] opacity-50" aria-hidden>
                <h2 className="font-semibold text-gray-800 mb-4">Deine Anpassung</h2>
                <div className="grid sm:grid-cols-3 gap-2 mb-6">
                  {[
                    { label: "Abnehmen", sub: "−500 kcal (empfohlen)" },
                    { label: "Halten", sub: "±0 kcal" },
                    { label: "Zunehmen", sub: "+300 kcal (empfohlen)" },
                  ].map((opt) => (
                    <div key={opt.label} className="text-left p-3 rounded-xl border border-gray-200">
                      <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{opt.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="h-2 bg-gray-200 rounded-full" />
              </div>
              {/* Overlay CTA */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1px] p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center mb-3">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-gray-800">Individuelles Defizit einstellen</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  Slider, Zeitplan, Zieldatum-Verknüpfung und Gesundheits-Warnungen — ab dem Basis-Plan.
                </p>
                <Link
                  href="#preise"
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-primary text-white px-6 py-2.5 text-sm font-medium hover:bg-primary-hover transition-colors"
                >
                  Basis-Plan entdecken →
                </Link>
              </div>
            </div>
          )}

          {/* Result-Karte */}
          <div className="bg-white rounded-2xl border border-primary/20 p-6 bg-primary-bg/20">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> Grundumsatz (BMR)</span>
                <span className="font-semibold text-gray-800">{result.bmr.toLocaleString("de-DE")} kcal</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> Gesamtumsatz (TDEE)</span>
                <span className="font-semibold text-gray-800">{result.tdee.toLocaleString("de-DE")} kcal</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Deine Anpassung</span>
                <span className={`font-semibold ${adjustment < 0 ? "text-red-600" : adjustment > 0 ? "text-green-600" : "text-gray-700"}`}>
                  {adjustment > 0 ? "+" : ""}{adjustment.toLocaleString("de-DE")} kcal
                </span>
              </div>
              <div className="border-t border-primary/15 pt-3 flex items-center justify-between">
                <span className="text-sm text-gray-700 flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Dein Tagesziel</span>
                <span className="text-2xl font-bold text-primary">{result.zielKcal.toLocaleString("de-DE")} kcal</span>
              </div>
              <div className="text-xs text-gray-500">
                Erwartete Veränderung:{" "}
                <span className={`font-medium ${result.kgPerWeek < 0 ? "text-red-600" : result.kgPerWeek > 0 ? "text-green-600" : "text-gray-700"}`}>
                  {result.kgPerWeek > 0 ? "+" : ""}{result.kgPerWeek.toString().replace(".", ",")} kg / Woche
                </span>
              </div>
            </div>

            {hasBasisOrHigher && warning && (
              <div
                className={`mt-4 rounded-xl px-4 py-3 text-sm border ${
                  warning.tone === "red"
                    ? "bg-red-50 border-red-200 text-red-800"
                    : warning.tone === "amber"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-green-50 border-green-200 text-green-800"
                }`}
              >
                {warning.tone === "red" ? "🔴 " : warning.tone === "amber" ? "⚠️ " : "✅ "}
                {warning.text}
              </div>
            )}

            {hasBasisOrHigher ? (
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || result.zielKcal < 1200}
                  className="inline-flex items-center gap-2 rounded-full bg-primary text-white px-5 py-2.5 text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saved ? <><Check className="w-4 h-4" /> Gespeichert</> : saving ? "Speichert…" : "Als mein Ziel speichern"}
                </button>
                {saveError && <span className="text-xs text-red-600">{saveError}</span>}
              </div>
            ) : (
              <p className="mt-4 text-xs text-gray-500">
                Im kostenlosen Plan siehst du deine Grundberechnung. Ab dem Basis-Plan kannst du das Defizit individuell anpassen und als Tagesziel speichern.
              </p>
            )}
          </div>
        </>
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
