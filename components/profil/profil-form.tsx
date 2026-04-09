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
} from "lucide-react";

interface ProfilFormProps {
  existingProfile: Record<string, unknown> | null;
  imageUrl?: string | null;
  displayName?: string;
  createdAt?: number | Date | null;
  credits?: { used: number; total: number };
}

export function ProfilForm({
  existingProfile,
  imageUrl,
  displayName,
  createdAt,
  credits,
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
  });

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
        <h2 className="font-serif text-2xl text-ink mt-4">
          {displayName || "Willkommen"}
        </h2>
        {memberSince ? (
          <p className="text-xs text-ink-muted mt-1">
            Mitglied seit {memberSince}
          </p>
        ) : (
          <span className="mt-2 inline-flex items-center text-[11px] font-medium text-primary bg-primary-pale px-3 py-0.5 rounded-full">
            Free Plan
          </span>
        )}
      </div>

      {/* Credits */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="font-serif text-lg text-ink">Deine Credits</h3>
          </div>
          <button
            type="button"
            className="bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-full px-4 py-2 transition"
          >
            Credits nachkaufen
          </button>
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
