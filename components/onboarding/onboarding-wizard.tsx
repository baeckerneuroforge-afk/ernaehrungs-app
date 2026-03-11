"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, ChevronRight, ChevronLeft, Check, Loader2, ShieldCheck, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { GESCHLECHT, ZIELE, ERNAEHRUNGSFORMEN, ALLERGIEN, AKTIVITAET } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userId: string;
  existingProfile: Record<string, unknown> | null;
  initialStep?: number;
}

export function OnboardingWizard({ userId, existingProfile, initialStep = 1 }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [consentDetailsOpen, setConsentDetailsOpen] = useState(false);

  // Form state
  const [name, setName] = useState((existingProfile?.name as string) || "");
  const [alterJahre, setAlterJahre] = useState((existingProfile?.alter_jahre as number) || "");
  const [geschlecht, setGeschlecht] = useState((existingProfile?.geschlecht as string) || "");
  const [groesseCm, setGroesseCm] = useState((existingProfile?.groesse_cm as number) || "");
  const [gewichtKg, setGewichtKg] = useState((existingProfile?.gewicht_kg as number) || "");
  const [ziel, setZiel] = useState((existingProfile?.ziel as string) || "");
  const [ernaehrungsform, setErnaehrungsform] = useState((existingProfile?.ernaehrungsform as string) || "");
  const [allergien, setAllergien] = useState<string[]>((existingProfile?.allergien as string[]) || []);
  const [aktivitaet, setAktivitaet] = useState((existingProfile?.aktivitaet as string) || "");
  const [krankheiten, setKrankheiten] = useState((existingProfile?.krankheiten as string) || "");

  function canProceed(): boolean {
    if (step === 1) return !!name.trim() && !!alterJahre && !!geschlecht;
    if (step === 2) return !!ziel && !!ernaehrungsform;
    if (step === 3) return !!aktivitaet;
    return true;
  }

  function toggleAllergie(a: string) {
    setAllergien((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  async function handleSaveProfile() {
    setSaving(true);
    const profileData = {
      user_id: userId,
      name: name.trim(),
      alter_jahre: Number(alterJahre),
      geschlecht,
      groesse_cm: groesseCm ? Number(groesseCm) : null,
      gewicht_kg: gewichtKg ? Number(gewichtKg) : null,
      ziel,
      ernaehrungsform,
      allergien,
      aktivitaet,
      krankheiten: krankheiten.trim() || null,
      onboarding_done: true,
    };

    await supabase.from("ea_profiles").upsert(profileData, { onConflict: "user_id" });
    setStep(4);
    setSaving(false);
  }

  async function handleConsentFinish(consent: boolean) {
    await supabase
      .from("ea_profiles")
      .update({ review_consent: consent })
      .eq("user_id", userId);
    setStep(5);
  }

  // Steps 1–4 shown in progress bar (4 = consent), step 5 = done
  const progressPct = step <= 4 ? (step / 4) * 100 : 100;

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
              <Leaf className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-gray-800 mb-1">
                  Erzähl mir von dir
                </h1>
                <p className="text-sm text-gray-500">
                  Damit ich dich besser beraten kann.
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Dein Vorname"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Alter</label>
                <input
                  type="number"
                  value={alterJahre}
                  onChange={(e) => setAlterJahre(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="z.B. 30"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">Geschlecht</label>
                <div className="flex gap-2">
                  {GESCHLECHT.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setGeschlecht(g.value)}
                      className={`flex-1 py-3 rounded-xl border text-sm transition ${
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Größe (cm)</label>
                  <input
                    type="number"
                    value={groesseCm}
                    onChange={(e) => setGroesseCm(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="170"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Gewicht (kg)</label>
                  <input
                    type="number"
                    value={gewichtKg}
                    onChange={(e) => setGewichtKg(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="70"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Ziel + Ernährungsform */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-gray-800 mb-1">
                  Was ist dein Ziel?
                </h1>
                <p className="text-sm text-gray-500">
                  Damit ich meine Empfehlungen anpassen kann.
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">Dein Ziel</label>
                <div className="space-y-2">
                  {ZIELE.map((z) => (
                    <button
                      key={z.value}
                      onClick={() => setZiel(z.value)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition ${
                        ziel === z.value
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-600 border-gray-200 hover:border-primary/30"
                      }`}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">
                  Ernährungsform
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ERNAEHRUNGSFORMEN.map((e) => (
                    <button
                      key={e.value}
                      onClick={() => setErnaehrungsform(e.value)}
                      className={`px-3 py-2.5 rounded-xl border text-sm transition ${
                        ernaehrungsform === e.value
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-600 border-gray-200 hover:border-primary/30"
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Gesundheit */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-gray-800 mb-1">
                  Gesundheit & Aktivität
                </h1>
                <p className="text-sm text-gray-500">
                  Fast geschafft – noch ein paar Details.
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">
                  Allergien / Unverträglichkeiten
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGIEN.map((a) => (
                    <button
                      key={a}
                      onClick={() => toggleAllergie(a)}
                      className={`px-3 py-2 rounded-full border text-sm transition ${
                        allergien.includes(a)
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-white text-gray-600 border-gray-200 hover:border-red-200"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">
                  Aktivitätslevel
                </label>
                <div className="space-y-2">
                  {AKTIVITAET.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setAktivitaet(a.value)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition ${
                        aktivitaet === a.value
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-600 border-gray-200 hover:border-primary/30"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Besonderheiten / Krankheiten (optional)
                </label>
                <textarea
                  value={krankheiten}
                  onChange={(e) => setKrankheiten(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  placeholder="z.B. Diabetes Typ 2, Hashimoto..."
                />
              </div>
            </div>
          )}

          {/* Step 4: Consent */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-primary-bg flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-xl font-bold text-gray-800 mb-2">
                  Datenschutz & Einwilligung
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Darf Janine (unser Ernährungsteam) deine Gespräche lesen, um die Qualität der KI-Antworten zu verbessern?
                </p>
              </div>

              {/* AI processing info */}
              <div className="bg-primary-bg/30 border border-primary-bg rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">So arbeitet die KI</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Deine Ernährungsdaten (Alter, Gewicht, Ziele, Tagebuch, Allergien) werden <strong>anonymisiert</strong> von einer KI analysiert, um dir persönliche Empfehlungen zu geben. Dein Name wird dabei <strong>nie übermittelt</strong>. Die Daten können nicht auf dich zurückgeführt werden.
                </p>
              </div>

              {/* What happens */}
              <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Was einsehbar wäre</p>
                  <ul className="space-y-1.5">
                    {[
                      "Deine Fragen und die Antworten der KI",
                      "Dein Vorname (aus deinem Profil oder wenn er im Chat erwähnt wird)",
                      "Gesundheits- und ernährungsbezogene Angaben aus dem Gespräch",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Was nicht passiert</p>
                  <ul className="space-y-1.5">
                    {[
                      "Keine Weitergabe deiner Daten an Dritte",
                      "Keine Nutzung für Werbung oder kommerzielle Zwecke",
                      "Deine E-Mail-Adresse bleibt verborgen",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Legal details expandable */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setConsentDetailsOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition"
                >
                  <span className="text-xs text-gray-500 font-medium">Rechtliche Details (DSGVO)</span>
                  {consentDetailsOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
                {consentDetailsOpen && (
                  <div className="px-4 py-3 bg-white space-y-2">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      <strong className="text-gray-700">Zweck:</strong> Qualitätssicherung und Verbesserung der KI-gestützten Ernährungsberatung.
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      <strong className="text-gray-700">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) sowie Art. 9 Abs. 2 lit. a DSGVO, da Gesprächsinhalte gesundheitsbezogene Daten enthalten können.
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      <strong className="text-gray-700">KI-Verarbeitung:</strong> Deine Ernährungsdaten werden anonymisiert (ohne Name, E-Mail oder ID) an die Claude API (Anthropic, USA) übermittelt. Es gelten EU-Standardvertragsklauseln (SCCs). API-Daten werden nicht für KI-Training verwendet und nach 7 Tagen gelöscht.
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      <strong className="text-gray-700">Empfänger:</strong> Anonymisierte Daten: Claude API (Anthropic). Bei Einwilligung zusätzlich: Janine (Mitarbeiterin des Betreibers). Keine sonstige Übermittlung an Dritte.
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      <strong className="text-gray-700">Speicherdauer:</strong> Solange dein Account besteht oder bis du die Einwilligung widerrufst.
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      <strong className="text-gray-700">Widerruf:</strong> Du kannst diese Einwilligung jederzeit ohne Angabe von Gründen in deinen Profileinstellungen widerrufen. Der Widerruf berührt nicht die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung.
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      <strong className="text-gray-700">Verantwortlicher:</strong> Andre Baecker, Hephaistos Systems, Alicenstrasse 48, 35390 Giessen · info@hephaistos-systems.de
                    </p>
                  </div>
                )}
              </div>

              {/* Consent buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleConsentFinish(true)}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-primary bg-primary-bg/30 text-left hover:bg-primary-bg/50 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Ja, ich willige ein</p>
                    <p className="text-xs text-gray-500 mt-0.5">Ausdrückliche Einwilligung gem. Art. 9 Abs. 2 lit. a DSGVO</p>
                  </div>
                </button>

                <button
                  onClick={() => handleConsentFinish(false)}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-gray-200 bg-white text-left hover:border-gray-300 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Nein danke</p>
                    <p className="text-xs text-gray-400 mt-0.5">Meine Gespräche bleiben vollständig privat</p>
                  </div>
                </button>
              </div>

              <p className="text-center text-xs text-gray-400">
                Einwilligung jederzeit widerrufbar unter Einstellungen → Profil.
              </p>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 5 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary-bg flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 mb-2">
                  Alles fertig, {name}!
                </h1>
                <p className="text-sm text-gray-500">
                  Dein Profil ist eingerichtet. Du kannst jetzt den Chat nutzen und
                  bekommst personalisierte Empfehlungen.
                </p>
              </div>
              <button
                onClick={() => router.push("/chat")}
                className="inline-flex items-center gap-2 text-sm text-white bg-primary px-6 py-3 rounded-xl hover:bg-primary-light transition"
              >
                <Leaf className="w-4 h-4" />
                Zum Chat
              </button>
            </div>
          )}

          {/* Navigation for steps 1–3 */}
          {step <= 3 && (
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1 text-sm text-gray-500 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Zurück
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed()}
                  className="flex-1 flex items-center justify-center gap-1 text-sm text-white bg-primary px-4 py-3 rounded-xl hover:bg-primary-light transition disabled:opacity-40"
                >
                  Weiter
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSaveProfile}
                  disabled={!canProceed() || saving}
                  className="flex-1 flex items-center justify-center gap-2 text-sm text-white bg-primary px-4 py-3 rounded-xl hover:bg-primary-light transition disabled:opacity-40"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Profil speichern
                </button>
              )}
            </div>
          )}

          {/* Step indicator */}
          {step <= 3 && (
            <p className="text-center text-xs text-gray-400 mt-4">
              Schritt {step} von 3
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
