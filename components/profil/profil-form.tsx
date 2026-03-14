"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ZIELE,
  ALLERGIEN,
  ERNAEHRUNGSFORMEN,
  AKTIVITAET,
  GESCHLECHT,
} from "@/types";
import { Save, CheckCircle, Eye, EyeOff, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

interface ProfilFormProps {
  userId: string;
  existingProfile: Record<string, unknown> | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ProfilForm({ userId: _userId, existingProfile }: ProfilFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [consent, setConsent] = useState<boolean | null>(
    existingProfile?.review_consent as boolean | null ?? null
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

    // Redirect to chat if first time
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

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Name */}
      <FormSection title="Persönliche Angaben">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vorname
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Dein Vorname"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alter
            </label>
            <input
              type="number"
              value={form.alter_jahre}
              onChange={(e) => updateField("alter_jahre", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="z.B. 32"
              min={10}
              max={120}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Geschlecht
          </label>
          <div className="flex gap-2 flex-wrap">
            {GESCHLECHT.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => updateField("geschlecht", g.value)}
                className={`px-4 py-2 rounded-xl text-sm border transition ${
                  form.geschlecht === g.value
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-gray-200 hover:border-primary-pale"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </FormSection>

      {/* Körperdaten */}
      <FormSection title="Körperdaten">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Größe (cm)
            </label>
            <input
              type="number"
              value={form.groesse_cm}
              onChange={(e) => updateField("groesse_cm", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="z.B. 170"
              min={100}
              max={250}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gewicht (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.gewicht_kg}
              onChange={(e) => updateField("gewicht_kg", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="z.B. 68.5"
              min={30}
              max={300}
            />
          </div>
        </div>
      </FormSection>

      {/* Ziel */}
      <FormSection title="Dein Ziel">
        <div className="flex gap-2 flex-wrap">
          {ZIELE.map((z) => (
            <button
              key={z.value}
              type="button"
              onClick={() => updateField("ziel", z.value)}
              className={`px-4 py-2 rounded-xl text-sm border transition ${
                form.ziel === z.value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-gray-200 hover:border-primary-pale"
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
      </FormSection>

      {/* Allergien */}
      <FormSection title="Allergien & Unverträglichkeiten">
        <p className="text-xs text-gray-400 mb-3">
          Wähle alle aus die auf dich zutreffen (optional)
        </p>
        <div className="flex gap-2 flex-wrap">
          {ALLERGIEN.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAllergie(a)}
              className={`px-4 py-2 rounded-xl text-sm border transition ${
                form.allergien.includes(a)
                  ? "bg-accent-warm text-white border-accent-warm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-primary-pale"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </FormSection>

      {/* Ernährungsform */}
      <FormSection title="Ernährungsform">
        <div className="flex gap-2 flex-wrap">
          {ERNAEHRUNGSFORMEN.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => updateField("ernaehrungsform", e.value)}
              className={`px-4 py-2 rounded-xl text-sm border transition ${
                form.ernaehrungsform === e.value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-gray-200 hover:border-primary-pale"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </FormSection>

      {/* Aktivitätslevel */}
      <FormSection title="Aktivitätslevel">
        <div className="flex gap-2 flex-wrap">
          {AKTIVITAET.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => updateField("aktivitaet", a.value)}
              className={`px-4 py-2 rounded-xl text-sm border transition ${
                form.aktivitaet === a.value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-gray-200 hover:border-primary-pale"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </FormSection>

      {/* Krankheiten */}
      <FormSection title="Besonderheiten (optional)">
        <textarea
          value={form.krankheiten}
          onChange={(e) => updateField("krankheiten", e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          rows={3}
          placeholder="z.B. Diabetes Typ 2, Reizdarm, Hashimoto – oder lass es frei wenn nichts zutrifft"
        />
      </FormSection>

      {/* Qualitätssicherung / Consent */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-gray-800 text-sm">Einwilligung zur Qualitätssicherung</h3>
          {consent === true && (
            <span className="ml-auto text-[10px] font-medium text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
              Aktiv
            </span>
          )}
          {consent === false && (
            <span className="ml-auto text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
              Abgelehnt
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Darf Janine (unser Ernährungsteam) deine Gespräche lesen, um die Qualität der KI-Antworten zu verbessern?
          Dabei können dein Name sowie gesundheitsbezogene Gesprächsinhalte sichtbar sein.
        </p>

        {/* Legal details expandable */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setConsentDetailsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition text-left"
          >
            <span className="text-xs text-gray-500 font-medium">Rechtliche Details (DSGVO)</span>
            {consentDetailsOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
          {consentDetailsOpen && (
            <div className="px-3 py-3 bg-white space-y-2 border-t border-gray-50">
              {[
                ["Zweck", "Qualitätssicherung und Verbesserung der KI-gestützten Ernährungsberatung."],
                ["Rechtsgrundlage", "Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) sowie Art. 9 Abs. 2 lit. a DSGVO, da Gesprächsinhalte gesundheitsbezogene Daten enthalten können."],
                ["Empfänger", "Ausschließlich Janine (Mitarbeiterin des Betreibers). Keine Weitergabe an Dritte."],
                ["Speicherdauer", "Solange dein Account besteht oder bis du die Einwilligung widerrufst."],
                ["Widerruf", "Jederzeit ohne Angabe von Gründen hier im Profil möglich. Der Widerruf berührt nicht die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung."],
                ["Verantwortlicher", "Andre Baecker, Hephaistos Systems, Alicenstrasse 48, 35390 Giessen · info@hephaistos-systems.de"],
              ].map(([label, text]) => (
                <p key={label} className="text-xs text-gray-500 leading-relaxed">
                  <strong className="text-gray-700">{label}:</strong> {text}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Toggle buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleConsentChange(true)}
            disabled={consentSaving}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition ${
              consent === true
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-600 border-gray-200 hover:border-primary/40"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Ja, ich willige ein
          </button>
          <button
            type="button"
            onClick={() => handleConsentChange(false)}
            disabled={consentSaving}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition ${
              consent === false
                ? "bg-gray-100 text-gray-700 border-gray-300"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            Widerrufen
          </button>
          {consentSaving && (
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Einwilligung gem. Art. 9 Abs. 2 lit. a DSGVO · Widerruf jederzeit möglich
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-primary text-white py-3 rounded-xl font-medium text-sm hover:bg-primary-light transition disabled:opacity-60 flex items-center justify-center gap-2"
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
            {existingProfile ? "Profil aktualisieren" : "Profil speichern & zum Chat"}
          </>
        )}
      </button>
    </form>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-800 mb-3 text-sm">{title}</h3>
      {children}
    </div>
  );
}
