"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Leaf, ChevronRight, ChevronLeft, Check, Loader2, ShieldCheck, Eye, EyeOff, ChevronDown, ChevronUp, Sparkles, Ban, AlertCircle } from "lucide-react";
import { GESCHLECHT, ZIELE, ERNAEHRUNGSFORMEN, ALLERGIEN, AKTIVITAET } from "@/types";

interface Props {
  userId: string;
  existingProfile: Record<string, unknown> | null;
  initialStep?: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function OnboardingWizard({ userId: _userId, existingProfile, initialStep = 1 }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [consentDetailsOpen, setConsentDetailsOpen] = useState(false);
  const [kiConsentDetailsOpen, setKiConsentDetailsOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<null | (() => void)>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Wait for the Clerk session cookie to be fully propagated before letting
  // the user submit anything. Right after sign-up the session is set via
  // setActive() but the middleware sometimes doesn't see the cookie on the
  // first couple of requests (classic race with GET /api/profile returning
  // 404 via auth.protect()). We poll until a real response comes back.
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      try {
        const res = await fetch("/api/profile", { credentials: "same-origin" });
        // 200 = existing profile; 204/404-json are also fine — any non-auth
        // response means the session is reaching our API route.
        if (!cancelled && res.status !== 401 && res.status !== 403) {
          setSessionReady(true);
          return;
        }
      } catch {
        // network hiccup — fall through to retry
      }
      attempts++;
      if (cancelled) return;
      if (attempts < 5) {
        setTimeout(check, 1000);
      } else {
        // Give up waiting — let the user try anyway, the retry helper
        // inside postJson will handle any remaining races.
        setSessionReady(true);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

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
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [kiConsentChecked, setKiConsentChecked] = useState(false);
  const [reviewConsentChecked, setReviewConsentChecked] = useState(false);

  // ── Field-level validation ────────────────────────────────────
  function alterError(): string | null {
    if (!alterJahre) return null;
    const n = Number(alterJahre);
    if (!Number.isFinite(n)) return "Bitte gib eine gültige Zahl ein.";
    if (n < 13) return "Du musst mindestens 13 Jahre alt sein, um Nutriva zu nutzen.";
    if (n > 120) return "Bitte gib ein realistisches Alter an.";
    return null;
  }
  function groesseError(): string | null {
    if (!groesseCm) return null;
    const n = Number(groesseCm);
    if (!Number.isFinite(n)) return "Bitte gib eine gültige Zahl ein.";
    if (n < 100 || n > 250) return "Bitte gib eine realistische Größe an (100–250 cm).";
    return null;
  }
  function gewichtError(): string | null {
    if (!gewichtKg) return null;
    const n = Number(gewichtKg);
    if (!Number.isFinite(n)) return "Bitte gib eine gültige Zahl ein.";
    if (n < 30 || n > 300) return "Bitte gib ein realistisches Gewicht an (30–300 kg).";
    return null;
  }

  function canProceed(): boolean {
    if (step === 1) {
      return (
        !!name.trim() &&
        !!alterJahre &&
        !!geschlecht &&
        !alterError() &&
        !groesseError() &&
        !gewichtError()
      );
    }
    if (step === 2) return !!ziel && !!ernaehrungsform;
    if (step === 3) return !!aktivitaet && agbAccepted;
    return true;
  }

  function toggleAllergie(a: string) {
    setAllergien((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  /**
   * Wraps fetch with two safety nets for the onboarding flow:
   *  1. `credentials: "same-origin"` — guarantees the Clerk __session cookie
   *     is sent even when a browser/extension defaults to "omit".
   *  2. 404 handling — the middleware redirects unauth'd API calls via
   *     Clerk's `auth.protect()`, which returns 404/_not-found. That's the
   *     classic signal that the session expired mid-onboarding. We reload so
   *     Clerk's client can re-run the handshake and restore the session.
   *
   * Returns true on success, false on "handled" errors (caller should abort).
   */
  async function postJson(url: string, payload: unknown, errorLabel: string): Promise<boolean> {
    setSaveError(null);
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });
      } catch {
        // Network error — treat like a transient failure and retry.
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        setSaveError(`${errorLabel}: Netzwerkfehler. Bitte versuche es erneut.`);
        return false;
      }

      // 401/403/404 right after sign-up usually means the Clerk session
      // cookie isn't fully propagated yet — retry after a short delay.
      if (
        (res.status === 401 || res.status === 403 || res.status === 404) &&
        attempt < maxRetries
      ) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({} as { error?: string }));
        setSaveError(
          `${errorLabel}: ${
            (errorData as { error?: string }).error ||
            "Bitte versuche es erneut."
          }`
        );
        return false;
      }
      return true;
    }
    setSaveError(`${errorLabel}: Bitte versuche es erneut.`);
    return false;
  }

  async function handleSaveProfile() {
    setLastAction(() => handleSaveProfile);
    setSaving(true);
    // DO NOT set onboarding_done here — that happens only after Step 5
    // (review_consent) is answered. Setting it early means a user who
    // closes the tab after Step 3 would be flagged as "done" and bypass
    // the KI/review consent questions on return — DSGVO violation.
    const ok = await postJson(
      "/api/profile",
      {
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
        // Gets stripped from the ea_profiles payload server-side and written
        // as agb_accepted_at on ea_users. See app/api/profile/route.ts.
        agb_accepted: agbAccepted,
      },
      "Dein Profil konnte nicht gespeichert werden"
    );
    setSaving(false);
    if (!ok) return;
    setStep(4);
  }

  async function handleKiConsent(consent: boolean) {
    setLastAction(() => () => handleKiConsent(consent));
    setSaving(true);
    const ok = await postJson(
      "/api/profile/consent",
      { consent, type: "ki" },
      "Einstellung konnte nicht gespeichert werden"
    );
    setSaving(false);
    if (!ok) return;
    setStep(5);
  }

  async function handleReviewConsent(consent: boolean) {
    setLastAction(() => () => handleReviewConsent(consent));
    setSaving(true);
    const consentOk = await postJson(
      "/api/profile/consent",
      { consent, type: "review" },
      "Einstellung konnte nicht gespeichert werden"
    );
    if (!consentOk) {
      setSaving(false);
      return;
    }
    // Final step — mark onboarding as complete. This is the ONLY place
    // onboarding_done is set, so the flag strictly implies "saw all consent
    // questions and answered them".
    const doneOk = await postJson(
      "/api/profile",
      { onboarding_done: true },
      "Onboarding konnte nicht abgeschlossen werden"
    );
    setSaving(false);
    if (!doneOk) return;
    // Router-Cache invalidieren, damit /chat den frischen DB-State liest
    // (sonst kann der SC-Cache review_consent noch als null sehen → Redirect-Loop).
    router.refresh();
    setStep(6);
  }

  // Steps 1–5 shown in progress bar (4 = KI consent, 5 = review consent), step 6 = done
  const progressPct = step <= 5 ? (step / 5) * 100 : 100;

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-surface-bg flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Wird vorbereitet…
          </div>
        </div>
      </div>
    );
  }

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

          {saveError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-700 leading-relaxed">
                  {saveError}
                </p>
                {lastAction && (
                  <button
                    onClick={() => {
                      setSaveError(null);
                      lastAction();
                    }}
                    disabled={saving}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : null}
                    Nochmal versuchen
                  </button>
                )}
              </div>
            </div>
          )}

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
                  min={13}
                  max={120}
                  value={alterJahre}
                  onChange={(e) => setAlterJahre(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                    alterError() ? "border-red-300" : "border-gray-200"
                  }`}
                  placeholder="z.B. 30"
                />
                {alterError() && (
                  <p className="mt-1 text-xs text-red-600">{alterError()}</p>
                )}
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
                    min={100}
                    max={250}
                    value={groesseCm}
                    onChange={(e) => setGroesseCm(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                      groesseError() ? "border-red-300" : "border-gray-200"
                    }`}
                    placeholder="170"
                  />
                  {groesseError() && (
                    <p className="mt-1 text-xs text-red-600">{groesseError()}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Gewicht (kg)</label>
                  <input
                    type="number"
                    min={30}
                    max={300}
                    value={gewichtKg}
                    onChange={(e) => setGewichtKg(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                      gewichtError() ? "border-red-300" : "border-gray-200"
                    }`}
                    placeholder="70"
                  />
                  {gewichtError() && (
                    <p className="mt-1 text-xs text-red-600">{gewichtError()}</p>
                  )}
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

              {/* AGB / Datenschutz — PFLICHT */}
              <label className="flex items-start gap-3 mt-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agbAccepted}
                  onChange={(e) => setAgbAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-stone-600">
                  Ich akzeptiere die{" "}
                  <a
                    href="/agb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    Nutzungsbedingungen
                  </a>{" "}
                  und habe die{" "}
                  <a
                    href="/datenschutz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    Datenschutzerklärung
                  </a>{" "}
                  gelesen.
                </span>
              </label>
            </div>
          )}

          {/* Step 4: KI-Consent (PFLICHT) */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-primary-bg flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-xl font-bold text-gray-800 mb-2">
                  KI-gestützte Ernährungsberatung
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Um dir persönliche Ernährungsempfehlungen geben zu können, werden deine Gesundheitsdaten (Alter, Gewicht, Ziele, Tagebuch, Allergien) anonymisiert von einer KI analysiert.
                </p>
              </div>

              <div className="bg-primary-bg/30 border border-primary-bg rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">Die Verarbeitung erfolgt über</p>
                <ul className="space-y-1">
                  <li className="text-xs text-gray-600 leading-relaxed">• <strong>Claude API</strong> (Anthropic, USA) – für die KI-Antworten</li>
                  <li className="text-xs text-gray-600 leading-relaxed">• <strong>OpenAI Embedding API</strong> (USA) – für die Suche in unserer Wissensbasis</li>
                </ul>
                <p className="text-xs text-gray-600 leading-relaxed mt-2">
                  Es gelten <strong>EU-Standardvertragsklauseln (SCCs)</strong>. Dein Name wird dabei nie übermittelt. Die API-Daten werden nicht für KI-Training verwendet.
                </p>
              </div>

              {/* Legal details expandable */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setKiConsentDetailsOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition"
                >
                  <span className="text-xs text-gray-500 font-medium">Rechtliche Details</span>
                  {kiConsentDetailsOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
                {kiConsentDetailsOpen && (
                  <div className="px-4 py-3 bg-white space-y-2">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      <strong className="text-gray-700">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) sowie Art. 9 Abs. 2 lit. a DSGVO.
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      <strong className="text-gray-700">Verantwortlicher:</strong> André Bäcker, Hephaistos Systems, Alicenstraße 48, 35390 Gießen, kontakt@nutriva-ai.de
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      <strong className="text-gray-700">Widerruf:</strong> Jederzeit in den Profileinstellungen möglich.
                    </p>
                  </div>
                )}
              </div>

              {/* Checkbox + Weiter-Button: erst nach Haken klickbar,
                  damit der User nicht denkt die Zustimmung sei vorausgewählt. */}
              <label className="flex items-start gap-3 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kiConsentChecked}
                  onChange={(e) => setKiConsentChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-stone-700">
                  Ich stimme der KI-gestützten Verarbeitung meiner Gesundheitsdaten gem. Art. 9 Abs. 2 lit. a DSGVO zu.
                </span>
              </label>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleKiConsent(true)}
                  disabled={!kiConsentChecked}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-primary text-white font-semibold text-sm transition hover:bg-primary/90 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Weiter mit KI-Beratung
                </button>

                <button
                  onClick={() => handleKiConsent(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm hover:border-gray-300 transition"
                >
                  <Ban className="w-4 h-4 text-gray-400" />
                  Ohne KI nutzen (nur Tagebuch & Tracking)
                </button>
              </div>

              <p className="text-center text-xs text-gray-400">
                Einwilligung jederzeit widerrufbar unter Einstellungen → Profil.
              </p>
            </div>
          )}

          {/* Step 5: Review-Consent (OPTIONAL) */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-primary-bg flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-xl font-bold text-gray-800 mb-2">
                  Qualitätssicherung
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Darf Janine (unsere Ernährungswissenschaftlerin) ausgewählte Gespräche einsehen, um die Wissensbasis und Empfehlungen zu verbessern?
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
                      <strong className="text-gray-700">Verantwortlicher:</strong> Andre Baecker, Hephaistos Systems, Alicenstrasse 48, 35390 Giessen · kontakt@nutriva-ai.de
                    </p>
                  </div>
                )}
              </div>

              {/* Checkbox + Weiter-Button: erst nach Haken klickbar */}
              <label className="flex items-start gap-3 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reviewConsentChecked}
                  onChange={(e) => setReviewConsentChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-stone-700">
                  Ich stimme zu, dass Janine ausgewählte Gespräche zur Qualitätssicherung einsehen darf (Art. 9 Abs. 2 lit. a DSGVO).
                </span>
              </label>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleReviewConsent(true)}
                  disabled={!reviewConsentChecked}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-primary text-white font-semibold text-sm transition hover:bg-primary/90 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4" />
                  Ja, ich helfe mit
                </button>

                <button
                  onClick={() => handleReviewConsent(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm hover:border-gray-300 transition"
                >
                  <EyeOff className="w-4 h-4 text-gray-400" />
                  Nein danke, Gespräche bleiben privat
                </button>
              </div>

              <p className="text-center text-xs text-gray-400">
                Einwilligung jederzeit widerrufbar unter Einstellungen → Profil.
              </p>
            </div>
          )}

          {/* Step 6: Done */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary-pale flex items-center justify-center mx-auto mb-4">
                  <Check className="w-10 h-10 text-primary" />
                </div>
                <h1 className="font-serif text-2xl text-ink mb-2">
                  Alles fertig, {name}!
                </h1>
                <p className="text-sm text-ink-muted">
                  Dein Profil ist eingerichtet. Zeit, loszulegen.
                </p>
              </div>

              {/* Feature preview */}
              <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold text-sm">15</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      Deine 15 kostenlosen Credits warten!
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                      Stelle deine ersten Ernährungsfragen im Chat — jede Antwort kostet 1 Credit.
                    </p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
                    Kostenlos enthalten
                  </p>
                  <ul className="text-sm text-ink space-y-1.5">
                    <li>· Chat mit der KI-Ernährungsberaterin</li>
                    <li>· Tagebuch für deine Mahlzeiten</li>
                    <li>· Tracker für Gewicht und Ziele</li>
                  </ul>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
                    Möchtest du mehr?
                  </p>
                  <p className="text-sm text-ink leading-relaxed">
                    Personalisierte <span className="font-medium">Ernährungspläne</span> und der <span className="font-medium">Wochenreview</span> gibt es ab dem Basis-Plan. Entscheide dich später, wenn du die App getestet hast.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  // Hard navigation: garantiert frische Server-Render von /chat
                  // ohne Router-Cache / Prefetch-Staleness. router.push() hatte
                  // teilweise noch den alten (pre-consent) /chat-RSC im Cache
                  // → /chat sah review_consent=null → Redirect zurück zu /onboarding.
                  window.location.assign("/home");
                }}
                className="w-full inline-flex items-center justify-center gap-2 text-sm text-white bg-primary hover:bg-primary-hover px-6 py-3 rounded-full shadow-card transition"
              >
                <Leaf className="w-4 h-4" />
                Los geht&apos;s — zum Chat
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
