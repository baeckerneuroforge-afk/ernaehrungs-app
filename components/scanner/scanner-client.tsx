"use client";

import { useEffect, useRef, useState, useCallback, Component, type ReactNode } from "react";
import {
  ScanLine,
  Loader2,
  Check,
  RotateCcw,
  Camera,
  BookOpen,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Error Boundary — catches html5-qrcode runtime crashes               */
/* ------------------------------------------------------------------ */
class ScannerErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err?.message || "Unbekannter Fehler" };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-10 space-y-3">
          <p className="text-red-600 text-sm">Scanner-Fehler: {this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="text-sm text-primary hover:underline"
          >
            Nochmal versuchen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* Scanner Client                                                      */
/* ------------------------------------------------------------------ */
export default function ScannerClient() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [portion, setPortion] = useState(100);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const scannerContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerInstanceRef = useRef<any>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const scanner = scannerInstanceRef.current;
      if (scanner) {
        try {
          const state = typeof scanner.getState === "function" ? scanner.getState() : 0;
          if (state === 2) scanner.stop().catch(() => {});
        } catch { /* ignore */ }
        scannerInstanceRef.current = null;
      }
    };
  }, []);

  const stopScan = useCallback(async () => {
    const scanner = scannerInstanceRef.current;
    if (!scanner) return;
    try {
      const state = typeof scanner.getState === "function" ? scanner.getState() : 0;
      if (state === 2) await scanner.stop();
    } catch (e) {
      console.warn("[scanner] Cleanup error:", e);
    }
    scannerInstanceRef.current = null;
    if (mountedRef.current) setScanning(false);
  }, []);

  const startScan = useCallback(async () => {
    if (scannerInstanceRef.current) return;
    const container = scannerContainerRef.current;
    if (!container) {
      setError("Scanner-Container nicht gefunden. Bitte Seite neu laden.");
      return;
    }

    setError("");
    setResult(null);
    setSaved(false);

    const containerId = "barcode-scanner-region";
    container.id = containerId;
    container.style.display = "";

    let Html5Qrcode;
    try {
      const mod = await import("html5-qrcode");
      Html5Qrcode = mod.Html5Qrcode;
    } catch (importErr) {
      console.error("[scanner] Failed to load html5-qrcode:", importErr);
      if (mountedRef.current) {
        setError("Scanner-Bibliothek konnte nicht geladen werden. Bitte versuche einen anderen Browser.");
      }
      return;
    }

    try {
      const scanner = new Html5Qrcode(containerId);
      scannerInstanceRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.777 },
        async (decodedText: string) => {
          try { await scanner.stop(); } catch { /* ok */ }
          scannerInstanceRef.current = null;
          if (mountedRef.current) {
            setScanning(false);
            await lookupBarcode(decodedText);
          }
        },
        () => {}
      );

      if (mountedRef.current) setScanning(true);
    } catch (err) {
      console.error("[scanner] Start failed:", err);
      scannerInstanceRef.current = null;
      if (!mountedRef.current) return;
      const msg = (err as Error)?.message || "";
      if (msg.includes("NotAllowed") || msg.includes("Permission")) {
        setError("Kamerazugriff verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.");
      } else if (msg.includes("NotFound") || msg.includes("Requested device not found")) {
        setError("Keine Kamera gefunden. Bitte verwende ein Gerät mit Kamera.");
      } else if (msg.includes("NotReadable") || msg.includes("Could not start")) {
        setError("Kamera wird von anderer App verwendet. Bitte schließe andere Apps.");
      } else {
        setError("Kamera konnte nicht gestartet werden. Bitte erlaube den Kamerazugriff.");
      }
    }
  }, []);

  const lookupBarcode = async (barcode: string) => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/scanner/lookup?barcode=${encodeURIComponent(barcode)}`);
      const data = await res.json();
      if (!mountedRef.current) return;
      if (data.product) {
        setResult(data.product);
      } else {
        setError("Produkt nicht gefunden. Versuche es mit einem anderen Barcode.");
      }
    } catch {
      if (mountedRef.current) setError("Fehler bei der Abfrage. Bitte versuche es erneut.");
    }
    if (mountedRef.current) setLoading(false);
  };

  const handleScanAgain = useCallback(async () => {
    setResult(null);
    setError("");
    setSaved(false);
    setPortion(100);
    await stopScan();
    setTimeout(() => { if (mountedRef.current) startScan(); }, 400);
  }, [stopScan, startScan]);

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
      if (res.ok) setSaved(true);
      else setError("Speichern fehlgeschlagen.");
    } catch {
      setError("Ein Fehler ist aufgetreten.");
    }
    setSaving(false);
  };

  const showPlaceholder = !scanning && !result && !loading;

  return (
    <ScannerErrorBoundary>
      <div className="space-y-4">
        {/* Scanner container — always in the DOM */}
        <div
          ref={scannerContainerRef}
          className={`w-full rounded-2xl overflow-hidden border border-border ${
            scanning
              ? "aspect-video bg-black"
              : showPlaceholder
                ? "aspect-video bg-ink/5 flex items-center justify-center"
                : "invisible h-0 overflow-hidden"
          }`}
        >
          {showPlaceholder && (
            <div className="text-center text-ink-faint">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Kamera wird hier angezeigt</p>
            </div>
          )}
        </div>

        {showPlaceholder && (
          <button
            onClick={startScan}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-3.5 rounded-full text-sm font-medium transition shadow-card"
          >
            <ScanLine className="w-4 h-4" />
            Scanner starten
          </button>
        )}

        {scanning && (
          <div className="text-center py-2">
            <p className="text-sm text-ink-muted animate-pulse">Halte den Barcode in den Rahmen...</p>
            <button onClick={stopScan} className="mt-2 text-xs text-ink-faint hover:text-ink transition">
              Abbrechen
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-sm text-ink-muted mt-2">Produkt wird gesucht...</p>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-2xl border border-border p-5 space-y-4 shadow-card animate-fade-in">
            <div className="flex items-start gap-3">
              {result.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.image} alt={result.name} className="w-16 h-16 rounded-xl object-cover border border-border flex-shrink-0" />
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
                <div className="flex justify-between text-sm"><span className="text-ink-muted">Protein</span><span className="font-medium text-ink">{result.protein}g</span></div>
                <div className="flex justify-between text-sm"><span className="text-ink-muted">Kohlenhydrate</span><span className="font-medium text-ink">{result.carbs}g</span></div>
                <div className="flex justify-between text-sm"><span className="text-ink-muted">Fett</span><span className="font-medium text-ink">{result.fat}g</span></div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-ink mb-1 block">Portion (g)</label>
              <input type="number" value={portion} onChange={(e) => setPortion(Math.max(1, Number(e.target.value) || 100))} className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              {portion !== 100 && (
                <p className="text-xs text-ink-faint mt-1">
                  = {Math.round(result.calories * portion / 100)} kcal · {Math.round(result.protein * portion / 100 * 10) / 10}g P · {Math.round(result.carbs * portion / 100 * 10) / 10}g K · {Math.round(result.fat * portion / 100 * 10) / 10}g F
                </p>
              )}
            </div>

            <button onClick={addToFoodLog} disabled={saving || saved} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-3 rounded-full text-sm font-medium transition disabled:opacity-60">
              {saved ? <><Check className="w-4 h-4" /> Im Tagebuch gespeichert</> : saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichert...</> : <><BookOpen className="w-4 h-4" /> Ins Tagebuch eintragen</>}
            </button>

            <button onClick={handleScanAgain} className="w-full flex items-center justify-center gap-2 border border-border text-ink-muted hover:text-primary hover:border-primary/40 py-2.5 rounded-full text-sm transition">
              <RotateCcw className="w-4 h-4" />
              Nächstes Produkt scannen
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
            <button onClick={handleScanAgain} className="text-primary font-medium ml-2 hover:underline">
              Nochmal versuchen
            </button>
          </div>
        )}
      </div>
    </ScannerErrorBoundary>
  );
}
