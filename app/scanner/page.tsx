"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { UpgradeCard } from "@/components/upgrade-card";
import {
  ScanLine,
  Loader2,
  Check,
  RotateCcw,
  Camera,
  BookOpen,
} from "lucide-react";

interface Product {
  name: string;
  brand: string | null;
  barcode: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  salt: number;
  image: string | null;
  nutriscore: string | null;
}

export default function ScannerPage() {
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [portion, setPortion] = useState(100);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUserPlan(data?.plan || "free"))
      .catch(() => setUserPlan("free"));
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch { /* already stopped */ }
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const startScan = async () => {
    setError("");
    setResult(null);
    setSaved(false);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("scanner-container");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          await scanner.stop();
          scannerRef.current = null;
          setScanning(false);
          await lookupBarcode(decodedText);
        },
        () => {} // no match yet
      );
      setScanning(true);
    } catch (err) {
      console.error("[scanner] Start failed:", err);
      setError("Kamera konnte nicht gestartet werden. Bitte erlaube den Kamerazugriff.");
    }
  };

  const lookupBarcode = async (barcode: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/scanner/lookup?barcode=${encodeURIComponent(barcode)}`);
      const data = await res.json();

      if (data.product) {
        setResult(data.product);
      } else {
        setError("Produkt nicht gefunden. Versuche es mit einem anderen Barcode.");
      }
    } catch {
      setError("Fehler bei der Abfrage. Bitte versuche es erneut.");
    }
    setLoading(false);
  };

  const addToFoodLog = async () => {
    if (!result) return;
    setSaving(true);

    const factor = portion / 100;
    try {
      const res = await fetch("/api/tagebuch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mahlzeit_typ: "snack",
          beschreibung: `${result.name}${result.brand ? ` (${result.brand})` : ""} — ${portion}g`,
          kalorien_geschaetzt: Math.round(result.calories * factor),
          protein_g: Math.round(result.protein * factor * 10) / 10,
          carbs_g: Math.round(result.carbs * factor * 10) / 10,
          fat_g: Math.round(result.fat * factor * 10) / 10,
          source: "manual",
        }),
      });
      if (res.ok) {
        setSaved(true);
      } else {
        setError("Speichern fehlgeschlagen.");
      }
    } catch {
      setError("Ein Fehler ist aufgetreten.");
    }
    setSaving(false);
  };

  const isPremium = userPlan === "pro_plus" || userPlan === "admin";

  if (userPlan === null) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-bg">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-bg">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 w-full">
          <div className="mb-6">
            <h1 className="font-serif text-3xl text-ink">Barcode-Scanner</h1>
            <p className="text-ink-muted text-sm mt-1">
              Scanne Lebensmittel und erfasse Nährwerte automatisch.
            </p>
          </div>
          <UpgradeCard
            icon={ScanLine}
            title="Barcode-Scanner"
            description="Scanne den Barcode eines Lebensmittels — Kalorien, Protein, Kohlenhydrate und Fett werden automatisch erkannt und ins Tagebuch eingetragen."
            features={[
              "Barcode scannen mit der Kamera",
              "Nährwerte aus 3 Mio.+ Produkten",
              "Direkt ins Tagebuch eintragen",
            ]}
            ctaLabel="Premium wählen — mit Scanner"
            ctaHref="/#preise"
            requiredPlan="pro_plus"
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-lg mx-auto px-4 sm:px-6 py-10 w-full">
        <h1 className="font-serif text-2xl text-ink mb-1">Barcode-Scanner</h1>
        <p className="text-ink-muted text-sm mb-6">
          Scanne den Barcode eines Lebensmittels — Nährwerte werden automatisch erkannt.
        </p>

        {/* Scanner container */}
        <div
          id="scanner-container"
          className={`w-full aspect-video rounded-2xl overflow-hidden bg-ink/5 border border-border mb-4 ${
            !scanning && !result ? "flex items-center justify-center" : ""
          }`}
        >
          {!scanning && !result && !loading && (
            <div className="text-center text-ink-faint">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Kamera wird hier angezeigt</p>
            </div>
          )}
        </div>

        {/* Start button */}
        {!scanning && !result && !loading && (
          <button
            onClick={startScan}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-3.5 rounded-full text-sm font-medium transition shadow-card"
          >
            <ScanLine className="w-4 h-4" />
            Scanner starten
          </button>
        )}

        {/* Scanning indicator */}
        {scanning && (
          <div className="text-center py-2">
            <p className="text-sm text-ink-muted animate-pulse">Halte den Barcode in den Rahmen...</p>
            <button
              onClick={async () => { await stopScanner(); setScanning(false); }}
              className="mt-2 text-xs text-ink-faint hover:text-ink transition"
            >
              Abbrechen
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-sm text-ink-muted mt-2">Produkt wird gesucht...</p>
          </div>
        )}

        {/* Result card */}
        {result && (
          <div className="bg-white rounded-2xl border border-border p-5 space-y-4 shadow-card mt-4 animate-fade-in">
            <div className="flex items-start gap-3">
              {result.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.image}
                  alt={result.name}
                  className="w-16 h-16 rounded-xl object-cover border border-border flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-ink text-lg leading-tight">{result.name}</h3>
                {result.brand && <p className="text-sm text-ink-muted">{result.brand}</p>}
                {result.nutriscore && (
                  <span className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    result.nutriscore === "a" ? "bg-green-100 text-green-700" :
                    result.nutriscore === "b" ? "bg-lime-100 text-lime-700" :
                    result.nutriscore === "c" ? "bg-yellow-100 text-yellow-700" :
                    result.nutriscore === "d" ? "bg-orange-100 text-orange-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    Nutri-Score {result.nutriscore.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary-faint rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-primary">{result.calories}</p>
                <p className="text-[10px] text-ink-muted">kcal / 100g</p>
              </div>
              <div className="space-y-1.5 py-1">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Protein</span>
                  <span className="font-medium text-ink">{result.protein}g</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Kohlenhydrate</span>
                  <span className="font-medium text-ink">{result.carbs}g</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Fett</span>
                  <span className="font-medium text-ink">{result.fat}g</span>
                </div>
              </div>
            </div>

            {/* Portion input */}
            <div>
              <label className="text-sm font-medium text-ink mb-1 block">Portion (g)</label>
              <input
                type="number"
                value={portion}
                onChange={(e) => setPortion(Math.max(1, Number(e.target.value) || 100))}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {portion !== 100 && (
                <p className="text-xs text-ink-faint mt-1">
                  = {Math.round(result.calories * portion / 100)} kcal · {Math.round(result.protein * portion / 100 * 10) / 10}g P · {Math.round(result.carbs * portion / 100 * 10) / 10}g K · {Math.round(result.fat * portion / 100 * 10) / 10}g F
                </p>
              )}
            </div>

            {/* Save to food log */}
            <button
              onClick={addToFoodLog}
              disabled={saving || saved}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-3 rounded-full text-sm font-medium transition disabled:opacity-60"
            >
              {saved ? (
                <><Check className="w-4 h-4" /> Im Tagebuch gespeichert</>
              ) : saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Speichert...</>
              ) : (
                <><BookOpen className="w-4 h-4" /> Ins Tagebuch eintragen</>
              )}
            </button>

            {/* Scan again */}
            <button
              onClick={() => { setResult(null); setSaved(false); setPortion(100); startScan(); }}
              className="w-full flex items-center justify-center gap-2 border border-border text-ink-muted hover:text-primary hover:border-primary/40 py-2.5 rounded-full text-sm transition"
            >
              <RotateCcw className="w-4 h-4" />
              Nächstes Produkt scannen
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mt-4">
            {error}
            <button
              onClick={() => { setError(""); startScan(); }}
              className="text-primary font-medium ml-2 hover:underline"
            >
              Nochmal versuchen
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
