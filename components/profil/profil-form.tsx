"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ZIELE,
  ALLERGIEN,
  ERNAEHRUNGSFORMEN,
  AKTIVITAET,
  GESCHLECHT,
} from "@/types";
import Link from "next/link";
import {
  Save,
  CheckCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  User,
  Scale,
  Salad,
  Settings,
  CreditCard,
  ArrowUpRight,
  Infinity as InfinityIcon,
  Crown,
  Sparkles,
  TrendingUp,
  Target,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { calculateTDEE, TIMEFRAME_LABEL } from "@/lib/tdee";

const TIMEFRAME_OPTIONS = [
  { value: "3_months", label: "3 Monate" },
  { value: "6_months", label: "6 Monate" },
  { value: "9_months", label: "9 Monate" },
  { value: "12_months", label: "12 Monate" },
  { value: "no_rush", label: "Kein Zeitdruck" },
];

type Plan = "free" | "pro" | "pro_plus" | "admin";

const PLAN_BADGE: Record<
  Plan,
  { label: string; class: string; icon: typeof Sparkles }
> = {
  free: {
    label: "Free",
    class: "bg-surface-muted text-ink-muted border-border",
    icon: Sparkles,
  },
  pro: {
    label: "Basis",
    class: "bg-primary-pale text-primary border-primary/30",
    icon: TrendingUp,
  },
  pro_plus: {
    label: "Premium",
    class: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Crown,
  },
  admin: {
    label: "Admin",
    class: "bg-primary-pale text-primary border-primary/30",
    icon: InfinityIcon,
  },
};

interface ProfilFormProps {
  existingProfile: Record<string, unknown> | null;
  imageUrl?: string | null;
  displayName?: string;
  createdAt?: number | Date | null;
  credits?: { used: number; total: number };
  plan?: Plan;
  totalCredits?: number;
}

export function ProfilForm({
  existingProfile,
  imageUrl,
  displayName,
  createdAt,
  credits,
  plan = "free",
  totalCredits = 0,
}: ProfilFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [consent, setConsent] = useState<boolean | null>(
    (existingProfile?.review_consent as boolean | null) ?? null
  );
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentDetailsOpen, setConsentDetailsOpen] = useState(false);

  const [form, setForm] = useState({
    name: (existingProfile?.name as string) || "",
    alter_jahre: (existingProfile?.alter_jahre as number) || "",
    geschlecht: (existingProfile?.geschlecht as string) || "",
    groesse_cm: (existingProfile?.groesse_cm as number) || "",
    gewicht_kg: (existingProfile?.gewicht_kg as number) || "",
    ziel: (existingProfile?.ziel as string) || "",
    allergien: (existingProfile?.allergien as string[]) || [],
    ernaehrungsform: (existingProfile?.ernaehrungsform as string) || "",
    krankheiten: (existingProfile?.krankheiten as string) || "",
    aktivitaet: (existingProfile?.aktivitaet as string) || "",
    target_weight: (existingProfile?.target_weight as number) || "",
    target_timeframe:
      (existingProfile?.target_timeframe as string) || "no_rush",
  });

  // Live-Vorschau des Defizits
  const tdeePreview = calculateTDEE({
    gewicht_kg: form.gewicht_kg ? Number(form.gewicht_kg) : null,
    groesse_cm: form.groesse_cm ? Number(form.groesse_cm) : null,
    alter_jahre: form.alter_jahre ? Number(form.alter_jahre) : null,
    geschlecht: form.geschlecht || null,
    aktivitaet: form.aktivitaet || null,
    ziel: form.ziel || null,
    target_weight: form.target_weight ? Number(form.target_weight) : null,
    target_timeframe: form.target_timeframe || null,
  });
  const deficit = tdeePreview?.customDeficit;

  function updateField(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function toggleAllergie(allergie: string) {
    setForm((prev) => ({
      ...prev,
      allergien: prev.allergien.includes(allergie)
        ? prev.allergien.filter((a) => a !== allergie)
        : [...prev.allergien, allergie],
    }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name || null,
        alter_jahre: form.alter_jahre ? Number(form.alter_jahre) : null,
        geschlecht: form.geschlecht || null,
        groesse_cm: form.groesse_cm ? Number(form.groesse_cm) : null,
        gewicht_kg: form.gewicht_kg ? Number(form.gewicht_kg) : null,
        ziel: form.ziel || null,
        allergien: form.allergien,
        ernaehrungsform: form.ernaehrungsform || null,
        krankheiten: form.krankheiten || null,
        aktivitaet: form.aktivitaet || null,
        target_weight: form.target_weight ? Number(form.target_weight) : null,
        target_timeframe: form.target_timeframe || "no_rush",
      }),
    });

    setSaving(false);
    setSaved(true);

    if (!existingProfile) {
      router.push("/chat");
    }
  }

  async function handleConsentChange(newConsent: boolean) {
    setConsentSaving(true);
    await fetch("/api/profile/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: newConsent }),
    });
    setConsent(newConsent);
    setConsentSaving(false);
  }

  const initials =
    (displayName || form.name || "?")
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString("de-DE", {
        month: "long",
        year: "numeric",
      })
    : null;

  const creditsUsed = credits?.used ?? 2;
  const creditsTotal = credits?.total ?? 15;
  const creditsRemaining = Math.max(creditsTotal - creditsUsed, 0);
  const creditsPct = Math.min((creditsUsed / creditsTotal) * 100, 100);

  const inputClass =
    "w-full rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";

  const chipClass = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm border transition ${
      active
        ? "bg-primary text-white border-primary"
        : "bg-white text-ink-muted border-border hover:border-primary/40"
    }`;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Avatar Header */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 flex flex-col items-center text-center mb-4">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={displayName || "Avatar"}
            width={80}
            height={80}
            className="w-20 h-20 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary-pale text-primary flex items-center justify-center font-serif text-2xl">
            {initials}
          </div>
        )}
        <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
          <h2 className="font-serif text-2xl text-ink">
            {displayName || "Willkommen"}
          </h2>
          {(() => {
            const badge = PLAN_BADGE[plan];
            const Icon = badge.icon;
            return (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border ${badge.class}`}
              >
                <Icon className="w-3 h-3" />
                {badge.label}
              </span>
            );
          })()}
        </div>
        {memberSince && (
          <p className="text-xs text-ink-muted mt-1">
            Mitglied seit {memberSince}
          </p>
        )}
        <p className="text-xs text-ink-muted mt-2">
          {plan === "admin" ? (
            <>Unbegrenzte Credits</>
          ) : totalCredits >= 0 ? (
            <>{totalCredits} Credits verfügbar</>
          ) : null}
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover mt-2 group"
        >
          Abo & Billing verwalten
          <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Credits */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="font-serif text-lg text-ink">Deine Credits</h3>
          </div>
          <Link
            href="/billing"
            className="bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-full px-4 py-2 transition"
          >
            Credits nachkaufen
          </Link>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-serif text-3xl text-ink">
            {creditsRemaining}
          </span>
          <span className="text-sm text-ink-muted">von {creditsTotal}</span>
        </div>
        <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${100 - creditsPct}%` }}
          />
        </div>
      </div>

      {/* Persönliche Daten */}
      <FormSection title="Persönliche Daten" icon={<User className="w-4 h-4 text-primary" />}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Vorname
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={inputClass}
              placeholder="Dein Vorname"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Alter
            </label>
            <input
              type="number"
              value={form.alter_jahre}
              onChange={(e) => updateField("alter_jahre", e.target.value)}
              className={inputClass}
              placeholder="z.B. 32"
              min={10}
              max={120}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-ink mb-2">
            Geschlecht
          </label>
          <div className="flex gap-2 flex-wrap">
            {GESCHLECHT.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => updateField("geschlecht", g.value)}
                className={chipClass(form.geschlecht === g.value)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Größe (cm)
            </label>
            <input
              type="number"
              value={form.groesse_cm}
              onChange={(e) => updateField("groesse_cm", e.target.value)}
              className={inputClass}
              placeholder="z.B. 170"
              min={100}
              max={250}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Gewicht (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.gewicht_kg}
              onChange={(e) => updateField("gewicht_kg", e.target.value)}
              className={inputClass}
              placeholder="z.B. 68.5"
              min={30}
              max={300}
            />
          </div>
        </div>
      </FormSection>

      {/* Ernährungsprofil */}
      <FormSection
        title="Ernährungsprofil"
        icon={<Salad className="w-4 h-4 text-primary" />}
      >
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Dein Ziel
          </label>
          <div className="flex gap-2 flex-wrap">
            {ZIELE.map((z) => (
              <button
                key={z.value}
                type="button"
                onClick={() => updateField("ziel", z.value)}
                className={chipClass(form.ziel === z.value)}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-ink mb-1">
            Allergien & Unverträglichkeiten
          </label>
          <p className="text-xs text-ink-faint mb-2">
            Wähle alle aus die auf dich zutreffen (optional)
          </p>
          <div className="flex gap-2 flex-wrap">
            {ALLERGIEN.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAllergie(a)}
                className={`px-4 py-2 rounded-full text-sm border transition ${
                  form.allergien.includes(a)
                    ? "bg-accent-warm text-white border-accent-warm"
                    : "bg-white text-ink-muted border-border hover:border-primary/40"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-ink mb-2">
            Ernährungsform
          </label>
          <div className="flex gap-2 flex-wrap">
            {ERNAEHRUNGSFORMEN.map((e) => (
              <button
                key={e.value}
                type="button"
                onClick={() => updateField("ernaehrungsform", e.value)}
                className={chipClass(form.ernaehrungsform === e.value)}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-ink mb-2">
            <span className="inline-flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-primary" />
              Aktivitätslevel
            </span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {AKTIVITAET.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => updateField("aktivitaet", a.value)}
                className={chipClass(form.aktivitaet === a.value)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-ink mb-1.5">
            Besonderheiten / Krankheiten
          </label>
          <textarea
            value={form.krankheiten}
            onChange={(e) => updateField("krankheiten", e.target.value)}
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="z.B. Diabetes Typ 2, Reizdarm, Hashimoto – oder lass es frei wenn nichts zutrifft"
          />
        </div>
      </FormSection>

      {/* Dein Ziel */}
      <FormSection
        title="Dein Ziel"
        icon={<Target className="w-4 h-4 text-primary" />}
      >
        <p className="text-xs text-ink-muted mb-4 leading-relaxed">
          Setz dir ein konkretes Wunschgewicht und einen Zeitraum — wir
          berechnen dann automatisch ein passendes, sicheres Kalorien­defizit.
          Lass es leer, wenn du kein konkretes Ziel hast.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Wunschgewicht (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.target_weight}
              onChange={(e) => updateField("target_weight", e.target.value)}
              className={inputClass}
              placeholder="z.B. 65.0"
              min={30}
              max={300}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Zeitraum
            </label>
            <select
              value={form.target_timeframe}
              onChange={(e) => updateField("target_timeframe", e.target.value)}
              className={inputClass}
            >
              {TIMEFRAME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live-Vorschau Defizit */}
        {deficit && tdeePreview && (
          <div className="mt-5 rounded-2xl border border-border bg-surface-muted/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-ink">
                  Dein berechnetes Defizit
                </span>
              </div>
              <SafetyBadge level={deficit.safetyLevel} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat
                label="Defizit / Tag"
                value={`-${deficit.dailyDeficit}`}
                unit="kcal"
              />
              <Stat
                label="Abnahme / Woche"
                value={deficit.weeklyLoss.toFixed(2)}
                unit="kg"
              />
              <Stat
                label="Ziel / Tag"
                value={`${deficit.targetCalories}`}
                unit="kcal"
              />
            </div>
            <p className="text-[11px] text-ink-faint mt-3 text-center">
              Basis: TDEE {tdeePreview.tdee} kcal · Ziel {deficit.totalLoss} kg
              in {TIMEFRAME_LABEL[form.target_timeframe]}
            </p>
            {deficit.warning && (
              <div
                className={`mt-3 rounded-xl px-3 py-2.5 text-xs leading-relaxed flex gap-2 items-start ${
                  deficit.safetyLevel === "dangerous" ||
                  deficit.safetyLevel === "underweight"
                    ? "bg-red-50 text-red-700 border border-red-100"
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}
              >
                {deficit.safetyLevel === "dangerous" ||
                deficit.safetyLevel === "underweight" ? (
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p>{deficit.warning}</p>
                  {(deficit.safetyLevel === "dangerous" ||
                    deficit.safetyLevel === "underweight") && (
                    <button
                      type="button"
                      onClick={() => updateField("target_timeframe", "12_months")}
                      className="mt-1.5 text-[11px] font-medium underline hover:no-underline"
                    >
                      Zeitraum auf 12 Monate anpassen
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </FormSection>

      {/* Einstellungen */}
      <FormSection
        title="Einstellungen"
        icon={<Settings className="w-4 h-4 text-primary" />}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h4 className="font-medium text-ink text-sm">
                  Einwilligung zur Qualitätssicherung
                </h4>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed mt-1.5">
                Darf Janine (unser Ernährungsteam) deine Gespräche lesen, um die
                Qualität der KI-Antworten zu verbessern? Dabei können dein Name
                sowie gesundheitsbezogene Gesprächsinhalte sichtbar sein.
              </p>
            </div>
            <Switch
              checked={consent === true}
              disabled={consentSaving}
              onChange={(v) => handleConsentChange(v)}
            />
          </div>

          {/* Legal details expandable */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setConsentDetailsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-muted hover:bg-surface-muted/70 transition text-left"
            >
              <span className="text-xs text-ink-muted font-medium">
                Rechtliche Details (DSGVO)
              </span>
              {consentDetailsOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-ink-faint" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-ink-faint" />
              )}
            </button>
            {consentDetailsOpen && (
              <div className="px-4 py-3 bg-white space-y-2 border-t border-border">
                {[
                  [
                    "Zweck",
                    "Qualitätssicherung und Verbesserung der KI-gestützten Ernährungsberatung.",
                  ],
                  [
                    "Rechtsgrundlage",
                    "Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) sowie Art. 9 Abs. 2 lit. a DSGVO, da Gesprächsinhalte gesundheitsbezogene Daten enthalten können.",
                  ],
                  [
                    "Empfänger",
                    "Ausschließlich Janine (Mitarbeiterin des Betreibers). Keine Weitergabe an Dritte.",
                  ],
                  [
                    "Speicherdauer",
                    "Solange dein Account besteht oder bis du die Einwilligung widerrufst.",
                  ],
                  [
                    "Widerruf",
                    "Jederzeit ohne Angabe von Gründen hier im Profil möglich. Der Widerruf berührt nicht die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung.",
                  ],
                  [
                    "Verantwortlicher",
                    "Andre Baecker, Hephaistos Systems, Alicenstrasse 48, 35390 Giessen · kontakt@nutriva-ai.de",
                  ],
                ].map(([label, text]) => (
                  <p
                    key={label}
                    className="text-xs text-ink-muted leading-relaxed"
                  >
                    <strong className="text-ink">{label}:</strong> {text}
                  </p>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-ink-faint">
            Einwilligung gem. Art. 9 Abs. 2 lit. a DSGVO · Widerruf jederzeit
            möglich
          </p>

          <div className="pt-4 border-t border-border">
            <Link
              href="/einstellungen"
              className="flex items-center justify-between gap-3 p-3 -mx-1 rounded-xl hover:bg-primary-faint transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center">
                  <Settings className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-ink">
                    Weitere Einstellungen
                  </div>
                  <div className="text-xs text-ink-muted">
                    Benachrichtigungen, Dark Mode und mehr
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-ink-faint group-hover:text-primary group-hover:translate-x-0.5 transition" />
            </Link>
          </div>
        </div>
      </FormSection>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-primary hover:bg-primary-hover text-white rounded-full px-6 py-3 shadow-card font-medium text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : saved ? (
          <>
            <CheckCircle className="w-4 h-4" />
            Gespeichert
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            {existingProfile
              ? "Profil aktualisieren"
              : "Profil speichern & zum Chat"}
          </>
        )}
      </button>
    </form>
  );
}

function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-serif text-lg text-ink">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border px-2 py-2.5">
      <div className="text-[10px] text-ink-faint uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-0.5">
        <span className="font-serif text-lg text-ink">{value}</span>
        <span className="text-[10px] text-ink-muted ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

function SafetyBadge({
  level,
}: {
  level: "safe" | "aggressive" | "dangerous" | "underweight";
}) {
  const map = {
    safe: { label: "Sicher", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    aggressive: { label: "Ambitioniert", class: "bg-amber-50 text-amber-700 border-amber-200" },
    dangerous: { label: "Risiko", class: "bg-red-50 text-red-700 border-red-200" },
    underweight: { label: "Untergewicht", class: "bg-red-50 text-red-700 border-red-200" },
  } as const;
  const b = map[level];
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${b.class}`}
    >
      {b.label}
    </span>
  );
}

function Switch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
        checked ? "bg-primary" : "bg-surface-muted border border-border"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
