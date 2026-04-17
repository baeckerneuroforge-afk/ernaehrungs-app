"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { UpgradeCard } from "@/components/upgrade-card";
import {
  Upload,
  FileText,
  Check,
  AlertTriangle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface ParsedEntry {
  datum?: string;
  name?: string;
  kalorien?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  mahlzeit_typ?: string | null;
  externe_quelle?: string;
  externe_id?: string;
}

interface ImportResult {
  detected_app: string;
  total: number;
  new: number;
  duplicates: number;
  preview: ParsedEntry[];
  entries: ParsedEntry[];
}

export default function ImportPage() {
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importCount, setImportCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUserPlan(data?.plan || "free"))
      .catch(() => setUserPlan("free"));
  }, []);

  const isPremium = userPlan === "pro_plus" || userPlan === "admin";

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/tagebuch/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Import fehlgeschlagen.");
        return;
      }

      setResult(data);
      setStep("preview");
    } catch {
      setError("Verbindungsfehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!result?.entries?.length) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tagebuch/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: result.entries }),
      });

      const data = await res.json();
      if (res.ok) {
        setImportCount(data.imported);
        setStep("done");
        toast.success(`${data.imported} Einträge importiert`);
      } else {
        setError("Import fehlgeschlagen. Bitte versuche es erneut.");
        toast.error("Import fehlgeschlagen");
      }
    } catch {
      setError("Verbindungsfehler.");
      toast.error("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  };

  if (userPlan === null) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-bg">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-ink-muted">Import wird vorbereitet …</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-lg mx-auto px-4 sm:px-6 py-10 w-full">
        <Link
          href="/einstellungen"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-primary transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Einstellungen
        </Link>

        <h1 className="font-serif text-2xl text-ink mb-1">Daten importieren</h1>
        <p className="text-ink-muted text-sm mb-8">
          Importiere deine Ernährungsdaten aus anderen Apps.
          Unterstützt: MyFitnessPal, Yazio, Lifesum, FDDB, Cronometer.
        </p>

        {!isPremium ? (
          <UpgradeCard
            icon={Upload}
            title="CSV-Import"
            description="Importiere deine Ernährungsdaten aus anderen Apps — automatische Erkennung von Format und Mahlzeiten."
            features={[
              "MyFitnessPal, Yazio, Lifesum, FDDB, Cronometer",
              "Automatische Format-Erkennung per KI",
              "Duplikat-Erkennung verhindert Doppeleinträge",
            ]}
            ctaLabel="Premium wählen — mit Import"
            ctaHref="/#preise"
            requiredPlan="pro_plus"
          />
        ) : (
          <div className="space-y-6">
            {/* Step 1: Upload */}
            {step === "upload" && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Upload className="w-8 h-8 mx-auto text-ink-faint mb-3" />
                  <p className="font-medium text-ink">
                    {file ? file.name : "CSV-Datei auswählen"}
                  </p>
                  <p className="text-xs text-ink-faint mt-1">
                    CSV, TSV oder TXT — max. 5 MB, max. 1.000 Einträge
                  </p>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />

                {file && (
                  <button
                    onClick={handleUpload}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-3.5 rounded-full text-sm font-medium transition shadow-card disabled:opacity-60"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Wird analysiert...</>
                    ) : (
                      <><FileText className="w-4 h-4" /> Datei analysieren</>
                    )}
                  </button>
                )}

                {/* Export instructions */}
                <details className="text-sm bg-white rounded-2xl border border-border p-4">
                  <summary className="cursor-pointer text-ink-muted hover:text-ink transition font-medium">
                    Wie exportiere ich meine Daten?
                  </summary>
                  <div className="mt-3 space-y-3 text-ink-muted text-xs leading-relaxed">
                    <div>
                      <p className="font-medium text-ink">MyFitnessPal</p>
                      <p>Einstellungen → Kontodaten → Daten exportieren → CSV herunterladen</p>
                    </div>
                    <div>
                      <p className="font-medium text-ink">Yazio</p>
                      <p>Profil → Einstellungen → Daten exportieren → &quot;Ernährung&quot; wählen</p>
                    </div>
                    <div>
                      <p className="font-medium text-ink">Lifesum</p>
                      <p>Profil → Einstellungen → Persönliche Daten → Daten exportieren</p>
                    </div>
                    <div>
                      <p className="font-medium text-ink">FDDB</p>
                      <p>fddb.info → Mein FDDB → Tagebuch → Export als CSV</p>
                    </div>
                    <div>
                      <p className="font-medium text-ink">Cronometer</p>
                      <p>Settings → Account → Export Data → Food Diary</p>
                    </div>
                  </div>
                </details>
              </div>
            )}

            {/* Step 2: Preview */}
            {step === "preview" && result && (
              <div className="space-y-4">
                <div className="bg-primary-faint border border-primary-pale rounded-2xl p-4 flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-ink">
                    Erkannt: <strong>{result.detected_app === "unknown" ? "CSV-Datei" : result.detected_app}</strong>
                    {" — "}{result.total} Einträge gefunden
                    {result.duplicates > 0 && `, ${result.duplicates} bereits vorhanden`}
                  </span>
                </div>

                {result.new > 0 ? (
                  <>
                    <p className="text-sm font-medium text-ink">
                      {result.new} neue Einträge zum Importieren:
                    </p>
                    <div className="max-h-96 sm:max-h-64 overflow-y-auto space-y-2 rounded-2xl border border-border p-3 bg-white">
                      {result.preview.map((entry, i) => (
                        <div key={i} className="rounded-xl bg-surface-muted px-3 py-2.5 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-ink truncate">{entry.name}</span>
                            <span className="text-ink-muted flex-shrink-0 ml-2">{entry.kalorien} kcal</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px] text-ink-faint mt-1">
                            <span>{entry.datum}</span>
                            {entry.mahlzeit_typ && <span>· {entry.mahlzeit_typ}</span>}
                            {entry.protein != null && <span>· P: {entry.protein}g</span>}
                            {entry.carbs != null && <span>· KH: {entry.carbs}g</span>}
                            {entry.fat != null && <span>· F: {entry.fat}g</span>}
                          </div>
                        </div>
                      ))}
                      {result.new > 10 && (
                        <p className="text-xs text-ink-faint text-center py-1">
                          ... und {result.new - 10} weitere Einträge
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => { setStep("upload"); setResult(null); setFile(null); }}
                        className="flex-1 text-sm text-ink-muted py-3 rounded-full border border-border hover:bg-surface-muted transition"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-3 rounded-full text-sm font-medium transition disabled:opacity-60"
                      >
                        {loading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Importiert...</>
                        ) : (
                          `${result.new} Einträge importieren`
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 bg-white rounded-2xl border border-border">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="font-medium text-ink">Alle Einträge sind bereits vorhanden</p>
                    <p className="text-sm text-ink-muted mt-1">Die Daten wurden schon importiert.</p>
                    <button
                      onClick={() => { setStep("upload"); setResult(null); setFile(null); }}
                      className="mt-4 text-sm text-ink-muted py-2.5 px-5 rounded-full border border-border hover:bg-surface-muted transition"
                    >
                      Andere Datei wählen
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Done */}
            {step === "done" && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary-faint flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-ink">
                  {importCount} Einträge importiert!
                </h2>
                <p className="text-sm text-ink-muted max-w-xs mx-auto">
                  Deine Daten sind jetzt im Tagebuch. Die KI berücksichtigt sie ab sofort in Chat, Wochenreview und Monatsreport.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link
                    href="/tagebuch"
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full text-sm font-medium transition"
                  >
                    Zum Tagebuch
                  </Link>
                  <button
                    onClick={() => { setStep("upload"); setResult(null); setFile(null); setImportCount(0); setError(""); }}
                    className="text-sm text-ink-muted py-2.5 px-5 rounded-full border border-border hover:bg-surface-muted transition"
                  >
                    Weitere Datei
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
