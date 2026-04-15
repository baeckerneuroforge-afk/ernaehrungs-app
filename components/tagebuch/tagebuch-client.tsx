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
  Camera,
  Lock,
  Sparkles,
  ImageIcon,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

interface Props {
  initialEntries: FoodLog[];
  today: string;
  canUsePhoto: boolean;
}

type Confidence = "sicher" | "mittel" | "unsicher";
type PhotoAnalysis = {
  dish: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  portion: string;
  confidence: Confidence;
  dailyBudgetPercent: number | null;
  tip: string;
};

const CONFIDENCE_STYLE: Record<
  Confidence,
  { label: string; className: string }
> = {
  sicher: { label: "Sicher", className: "bg-emerald-100 text-emerald-700" },
  mittel: { label: "Mittel", className: "bg-yellow-100 text-yellow-700" },
  unsicher: { label: "Unsicher", className: "bg-orange-100 text-orange-700" },
};

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

/**
 * Komprimiert ein Bild browser-seitig per Canvas auf max. 1600px
 * längste Kante, JPEG Q0.85. Typische Resultate: 300-800 KB.
 *
 * Das ist wichtig wegen Vercel's 4.5 MB Request-Body-Limit: ein
 * unkomprimiertes iPhone-Foto ist 5-8 MB und würde direkt am
 * Gateway abgewiesen (HTML 500, kein Function-Log).
 *
 * Zwei-Stufen-Strategie:
 *   1) createImageBitmap (schneller, iOS 16+, Chrome, Firefox)
 *   2) HTMLImageElement via FileReader (universeller Fallback für
 *      altes Safari und HEIC-JPEG-Kombinationen die Bitmap schmerzt)
 *
 * Wirft einen Error wenn beide Stufen scheitern UND die Datei > 3 MB
 * ist — dann kommt eh nichts Sinnvolles beim Server an.
 */
type Drawable =
  | HTMLImageElement
  | ImageBitmap;

async function compressImage(file: File): Promise<File> {
  const MAX = 1600;
  const QUALITY = 0.85;

  const drawAndEncode = async (
    source: Drawable,
    srcW: number,
    srcH: number
  ): Promise<Blob | null> => {
    const ratio = Math.min(1, MAX / Math.max(srcW, srcH));
    const w = Math.round(srcW * ratio);
    const h = Math.round(srcH * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, w, h);
    return new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );
  };

  // --- Stufe 1: createImageBitmap (schnell, moderne Browser)
  try {
    const bitmap = await createImageBitmap(file);
    const blob = await drawAndEncode(bitmap, bitmap.width, bitmap.height);
    bitmap.close?.();
    if (blob && blob.size > 0) {
      return new File([blob], "photo.jpg", { type: "image/jpeg" });
    }
  } catch (err) {
    console.warn("[foto-client] compress stage 1 failed:", (err as Error)?.message);
  }

  // --- Stufe 2: HTMLImageElement via data URL (Fallback für altes Safari)
  try {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image load failed"));
      el.src = dataUrl;
    });
    const blob = await drawAndEncode(img, img.naturalWidth, img.naturalHeight);
    if (blob && blob.size > 0) {
      return new File([blob], "photo.jpg", { type: "image/jpeg" });
    }
  } catch (err) {
    console.warn("[foto-client] compress stage 2 failed:", (err as Error)?.message);
  }

  // --- Fallback: Original akzeptieren, aber NUR wenn < 3 MB.
  // Darüber hinaus würde Vercel's 4.5 MB Gateway-Cap zuschlagen.
  if (file.size < 3 * 1024 * 1024) {
    return file;
  }
  throw new Error(
    "Bild konnte nicht komprimiert werden und ist zu groß. Bitte ein anderes Foto wählen oder die Kamera-App für den Upload nutzen."
  );
}

export function TagebuchClient({ initialEntries, today, canUsePhoto }: Props) {
  const [datum, setDatum] = useState(today);
  const [entries, setEntries] = useState<FoodLog[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state
  const [formTyp, setFormTyp] = useState<MealTyp>("fruehstueck");
  const [formBeschreibung, setFormBeschreibung] = useState("");
  const [formKcal, setFormKcal] = useState("");
  const [formUhrzeit, setFormUhrzeit] = useState("");
  // Hidden state — nicht im Formular sichtbar, aber persistiert.
  const [formProtein, setFormProtein] = useState<number | null>(null);
  const [formCarbs, setFormCarbs] = useState<number | null>(null);
  const [formFat, setFormFat] = useState<number | null>(null);
  const [formPhotoUrl, setFormPhotoUrl] = useState<string | null>(null);
  const [formSource, setFormSource] = useState<"manual" | "photo">("manual");
  const [formPhotoTip, setFormPhotoTip] = useState<string | null>(null);
  const [formPhotoBudget, setFormPhotoBudget] = useState<number | null>(null);

  // Nach dem Speichern eines Foto-Eintrags: 5-Sekunden-Feedback-Leiste
  // über dem Eintrag anzeigen.
  const [feedbackPromptId, setFeedbackPromptId] = useState<string | null>(null);
  const [feedbackDetailId, setFeedbackDetailId] = useState<string | null>(null);

  // Photo analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Lightbox für Foto-Galerie
  const [lightboxEntry, setLightboxEntry] = useState<FoodLog | null>(null);

  function resetForm() {
    setFormBeschreibung("");
    setFormKcal("");
    setFormProtein(null);
    setFormCarbs(null);
    setFormFat(null);
    setFormPhotoUrl(null);
    setFormSource("manual");
    setFormPhotoTip(null);
    setFormPhotoBudget(null);
    setAnalysis(null);
    setAnalysisError(null);
    setSaveError(null);
  }

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
    resetForm();
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset input so the same file can be picked again later
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (!file) return;

    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysis(null);

    try {
      console.log("[foto-client] original file", {
        name: file.name,
        size: file.size,
        type: file.type,
      });
      let compressed: File;
      try {
        compressed = await compressImage(file);
      } catch (err) {
        console.error("[foto-client] compression threw:", err);
        setAnalysisError(
          (err as Error)?.message ||
            "Bild konnte nicht vorbereitet werden."
        );
        return;
      }
      console.log("[foto-client] compressed", {
        size: compressed.size,
        type: compressed.type,
      });
      // Harte Client-Grenze: Vercel gateway wirft > 4.5 MB weg.
      if (compressed.size > 4 * 1024 * 1024) {
        setAnalysisError(
          `Bild ist nach Komprimierung immer noch zu groß (${Math.round(compressed.size / 1024 / 1024)} MB). Bitte ein anderes Foto wählen.`
        );
        return;
      }

      const fd = new FormData();
      fd.append("image", compressed);
      fd.append("datum", datum);

      console.log("[foto-client] POST /api/food-log/analyze …");
      let res: Response;
      try {
        res = await fetch("/api/food-log/analyze", {
          method: "POST",
          body: fd,
        });
      } catch (netErr) {
        console.error("[foto-client] network error:", netErr);
        setAnalysisError(
          `Netzwerk-Fehler: ${(netErr as Error)?.message || "unbekannt"}`
        );
        return;
      }
      console.log("[foto-client] response status", res.status, res.statusText);

      const bodyText = await res.text();
      console.log("[foto-client] response body", bodyText.slice(0, 500));

      if (!res.ok) {
        let err: { message?: string; error?: string; detail?: string } = {};
        try {
          err = JSON.parse(bodyText);
        } catch {
          /* plain text */
        }
        const msg =
          err?.message ||
          err?.detail ||
          err?.error ||
          bodyText.slice(0, 200) ||
          `HTTP ${res.status}`;
        setAnalysisError(`Foto-Analyse fehlgeschlagen: ${msg}`);
        return;
      }

      const json = JSON.parse(bodyText) as {
        analysis: PhotoAnalysis;
        photo_url: string | null;
      };
      const a = json.analysis;
      setAnalysis(a);
      // Beschreibung = nur Gericht + Portion. Makros fließen in hidden state.
      setFormBeschreibung(
        [a.dish, a.portion].filter(Boolean).join(" · ") || "Mahlzeit"
      );
      if (a.calories != null) setFormKcal(String(a.calories));
      setFormProtein(a.protein);
      setFormCarbs(a.carbs);
      setFormFat(a.fat);
      setFormPhotoUrl(json.photo_url);
      setFormSource("photo");
      setFormPhotoTip(a.tip || null);
      setFormPhotoBudget(a.dailyBudgetPercent);
    } catch (err) {
      console.error("[foto-client] unexpected error:", err);
      setAnalysisError(
        `Foto-Analyse fehlgeschlagen: ${(err as Error)?.message || "unbekannt"}`
      );
    } finally {
      setAnalyzing(false);
    }
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
    setSaveError(null);

    try {
      const res = await fetch("/api/tagebuch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mahlzeit_typ: formTyp,
          beschreibung: formBeschreibung.trim(),
          kalorien_geschaetzt: formKcal ? parseInt(formKcal) : null,
          protein_g: formProtein,
          carbs_g: formCarbs,
          fat_g: formFat,
          uhrzeit: formUhrzeit || null,
          source: formSource,
          photo_url: formPhotoUrl,
          photo_tip: formPhotoTip,
          photo_daily_budget_percent: formPhotoBudget,
          datum,
        }),
      });

      if (res.ok) {
        const entry = (await res.json()) as FoodLog;
        const wasPhotoEntry = formSource === "photo";
        console.log("[tagebuch] Save success:", {
          wasPhotoEntry,
          entryId: entry?.id,
          formSource,
          entryKeys: entry ? Object.keys(entry) : null,
        });
        setEntries((prev) => [...prev, entry]);
        closeForm();
        // Foto-Einträge: 5s lang Feedback-Leiste zeigen
        if (wasPhotoEntry && entry?.id) {
          setFeedbackPromptId(entry.id);
          setFeedbackDetailId(null);
          setTimeout(() => {
            setFeedbackPromptId((current) =>
              current === entry.id ? null : current
            );
          }, 5000);
        } else if (wasPhotoEntry) {
          console.warn(
            "[tagebuch] Photo entry saved but feedback bar skipped — entry.id missing",
            entry
          );
        }
      } else {
        const errorData = await res
          .json()
          .catch(() => ({} as { error?: string }));
        setSaveError(
          errorData?.error || `Fehler beim Speichern (${res.status})`
        );
        console.error("[tagebuch] Save failed:", res.status, errorData);
      }
    } catch (err) {
      setSaveError("Netzwerk-Fehler. Bitte prüfe deine Verbindung.");
      console.error("[tagebuch] Network error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function submitFeedback(
    entryId: string,
    feedback: "accurate" | "too_low" | "too_high"
  ) {
    // Optimistisch schließen
    if (feedback === "accurate") {
      setFeedbackPromptId(null);
      setFeedbackDetailId(null);
    } else {
      // Bei 👎 erstmal Detail-Auswahl zeigen statt sofort zu schließen
      if (!feedbackDetailId || feedbackDetailId !== entryId) {
        setFeedbackDetailId(entryId);
        return;
      }
      setFeedbackPromptId(null);
      setFeedbackDetailId(null);
    }
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, photo_feedback: feedback } : e
      )
    );
    await fetch(`/api/tagebuch/${entryId}/feedback`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback }),
    }).catch(() => {
      /* silent — Feedback ist optional */
    });
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
  const totalProtein = entries.reduce(
    (sum, e) => sum + (e.protein_g || 0),
    0
  );
  const totalCarbs = entries.reduce(
    (sum, e) => sum + (e.carbs_g || 0),
    0
  );
  const totalFat = entries.reduce(
    (sum, e) => sum + (e.fat_g || 0),
    0
  );
  const hasMacros = totalProtein > 0 || totalCarbs > 0 || totalFat > 0;

  const weekDays = buildWeekStrip(datum);

  // Alle Einträge mit Foto für die Tages-Galerie
  const photoEntries = entries.filter((e) => e.photo_url);

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
          <p className={`text-sm font-semibold mt-0.5 ${hasMacros ? "text-ink" : "text-ink-muted"}`}>
            {hasMacros ? `${Math.round(totalProtein)}g` : "—"}
          </p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint">
            Carbs
          </p>
          <p className={`text-sm font-semibold mt-0.5 ${hasMacros ? "text-ink" : "text-ink-muted"}`}>
            {hasMacros ? `${Math.round(totalCarbs)}g` : "—"}
          </p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint">
            Fett
          </p>
          <p className={`text-sm font-semibold mt-0.5 ${hasMacros ? "text-ink" : "text-ink-muted"}`}>
            {hasMacros ? `${Math.round(totalFat)}g` : "—"}
          </p>
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
          {/* Tages-Foto-Galerie — nur wenn mindestens 1 Foto existiert */}
          {photoEntries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-ink-faint" />
                <h3 className="text-xs uppercase tracking-wide text-ink-faint font-medium">
                  Fotos heute
                </h3>
              </div>
              <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                {photoEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setLightboxEntry(entry)}
                    className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-card transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.photo_url!}
                      alt={entry.beschreibung}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

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
                    <div key={entry.id} className="space-y-2">
                      {/* Feedback-Leiste — nur für Foto-Einträge direkt
                          nach dem Speichern, 5 Sekunden lang */}
                      {feedbackPromptId === entry.id && (
                        <div className="bg-primary-faint border border-primary/20 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 animate-fade-in">
                          {feedbackDetailId === entry.id ? (
                            <>
                              <span className="text-xs text-ink-muted">
                                Was war daneben?
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => submitFeedback(entry.id, "too_low")}
                                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-border hover:border-primary/40 text-ink transition"
                                >
                                  Eher zu wenig
                                </button>
                                <button
                                  onClick={() => submitFeedback(entry.id, "too_high")}
                                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-border hover:border-primary/40 text-ink transition"
                                >
                                  Eher zu viel
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-ink-muted">
                                War die Schätzung passend?
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => submitFeedback(entry.id, "accurate")}
                                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white border border-border hover:border-primary/40 text-ink transition"
                                  aria-label="Passt"
                                >
                                  <ThumbsUp className="w-3 h-3" /> Passt
                                </button>
                                <button
                                  onClick={() => setFeedbackDetailId(entry.id)}
                                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white border border-border hover:border-primary/40 text-ink transition"
                                  aria-label="Daneben"
                                >
                                  <ThumbsDown className="w-3 h-3" /> Daneben
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <div className="bg-white rounded-2xl border border-border p-4 flex items-start justify-between gap-3 shadow-card">
                        {entry.photo_url && (
                          <button
                            type="button"
                            onClick={() => setLightboxEntry(entry)}
                            className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-stone-200 shadow-sm"
                            aria-label="Foto vergrößern"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={entry.photo_url}
                              alt={entry.beschreibung}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full ${style.badge}`}
                            >
                              <Icon className="w-3 h-3" />
                              {style.label}
                            </span>
                            {entry.uhrzeit && (
                              <span className="text-[10px] text-ink-faint">
                                {entry.uhrzeit.slice(0, 5)}
                              </span>
                            )}
                            {entry.source === "photo" &&
                              entry.photo_daily_budget_percent != null && (
                                <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-faint text-primary">
                                  ~{entry.photo_daily_budget_percent}% Tagesbedarf
                                </span>
                              )}
                          </div>
                          <p className="text-sm text-ink leading-relaxed">
                            {entry.beschreibung}
                          </p>
                          {entry.kalorien_geschaetzt && (
                            <p className="text-xs text-ink-faint mt-1.5">
                              ~{entry.kalorien_geschaetzt} kcal
                            </p>
                          )}
                          {(entry.protein_g || entry.carbs_g || entry.fat_g) ? (
                            <div className="flex gap-3 text-[11px] text-ink-faint mt-1">
                              {entry.protein_g != null && entry.protein_g > 0 && (
                                <span>P: {Math.round(entry.protein_g * 10) / 10}g</span>
                              )}
                              {entry.carbs_g != null && entry.carbs_g > 0 && (
                                <span>KH: {Math.round(entry.carbs_g * 10) / 10}g</span>
                              )}
                              {entry.fat_g != null && entry.fat_g > 0 && (
                                <span>F: {Math.round(entry.fat_g * 10) / 10}g</span>
                              )}
                            </div>
                          ) : null}
                          {entry.source === "photo" && entry.photo_tip && (
                            <p className="text-xs text-stone-500 italic mt-1.5 leading-snug">
                              {entry.photo_tip}
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

      {/* Lightbox für Foto-Galerie */}
      {lightboxEntry && lightboxEntry.photo_url && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxEntry(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxEntry(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxEntry.photo_url}
              alt={lightboxEntry.beschreibung}
              className="w-full max-h-[70vh] object-contain rounded-2xl"
            />
            <div className="mt-4 text-center text-white">
              <p className="text-base font-medium">
                {lightboxEntry.beschreibung}
              </p>
              <p className="text-xs text-white/70 mt-1">
                {lightboxEntry.kalorien_geschaetzt
                  ? `~${lightboxEntry.kalorien_geschaetzt} kcal`
                  : null}
                {lightboxEntry.kalorien_geschaetzt && lightboxEntry.uhrzeit
                  ? " · "
                  : null}
                {lightboxEntry.uhrzeit ? lightboxEntry.uhrzeit.slice(0, 5) : null}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add entry sheet / modal */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-ink/40 animate-fade-in"
            onClick={() => !saving && closeForm()}
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-card animate-slide-in-up sm:mb-0">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="font-serif text-xl text-ink">
                Eintrag hinzufügen
              </h2>
              <button
                onClick={() => !saving && closeForm()}
                className="text-ink-muted hover:text-ink transition p-1"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 pb-6 space-y-4">
              {/* Foto-Tracking (Premium) */}
              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handlePhotoSelected}
                  aria-hidden
                />
                {canUsePhoto ? (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={analyzing || saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-primary/40 bg-primary-faint/40 text-sm font-medium text-primary hover:bg-primary-faint transition disabled:opacity-60"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analysiere dein Essen…
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        Foto aufnehmen & analysieren
                      </>
                    )}
                  </button>
                ) : (
                  <div
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-border bg-surface-muted text-sm text-ink-faint cursor-not-allowed"
                    title="Foto-Tracking ist im Premium-Plan verfügbar"
                  >
                    <Lock className="w-4 h-4" />
                    Foto-Tracking (Premium)
                  </div>
                )}

                {analysisError && (
                  <p className="mt-2 text-xs text-red-600">{analysisError}</p>
                )}

                {analysis && (
                  <div className="mt-3 rounded-2xl border border-border bg-white px-3 py-2 flex items-center gap-2 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-ink-muted truncate">
                      KI-Schätzung: {analysis.dish || "Mahlzeit erkannt"}
                    </span>
                    <span
                      className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${CONFIDENCE_STYLE[analysis.confidence].className}`}
                    >
                      {CONFIDENCE_STYLE[analysis.confidence].label}
                    </span>
                  </div>
                )}
              </div>

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

              {/* Expandable macro fields */}
              <details className="group">
                <summary className="text-xs text-ink-faint cursor-pointer hover:text-ink-muted transition select-none flex items-center gap-1">
                  <span className="group-open:hidden">▸</span>
                  <span className="hidden group-open:inline">▾</span>
                  Makros hinzufügen (optional)
                </summary>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <label className="block text-[10px] text-ink-faint mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={formProtein ?? ""}
                      onChange={(e) => setFormProtein(e.target.value ? Number(e.target.value) : null)}
                      min={0}
                      max={500}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-surface-bg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-faint mb-1">Kohlenhydrate (g)</label>
                    <input
                      type="number"
                      value={formCarbs ?? ""}
                      onChange={(e) => setFormCarbs(e.target.value ? Number(e.target.value) : null)}
                      min={0}
                      max={1000}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-surface-bg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-faint mb-1">Fett (g)</label>
                    <input
                      type="number"
                      value={formFat ?? ""}
                      onChange={(e) => setFormFat(e.target.value ? Number(e.target.value) : null)}
                      min={0}
                      max={500}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-surface-bg"
                      placeholder="0"
                    />
                  </div>
                </div>
              </details>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={closeForm}
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
              {saveError && (
                <p className="text-red-500 text-sm mt-2">{saveError}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
