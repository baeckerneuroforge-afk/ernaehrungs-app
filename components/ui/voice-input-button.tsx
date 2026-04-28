"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/* ----------------------------------------------------------------------
   Web Speech API typings — not in lib.dom.d.ts on every TS target. We
   declare the minimum surface we use so the component compiles cleanly
   without `any`. Audio is processed by the browser/OS (Chrome/Edge route
   through Google servers, Safari through Apple). We never see the audio.
---------------------------------------------------------------------- */
interface SpeechAlt {
  transcript: string;
}
interface SpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlt;
}
interface SpeechResultList {
  readonly length: number;
  [index: number]: SpeechResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/** iOS Safari ends recognition after short pauses. We auto-restart silently
 *  while the user still wants to record, capped at 60s to avoid runaway
 *  sessions / battery drain / mic-light fatigue. */
const MAX_SESSION_MS = 60_000;

/** localStorage flag set after the user actively confirms the onboarding
 *  modal once. Survives across sessions; "Abbrechen" does NOT set it,
 *  so users who dismiss can still get the explainer next time. */
const ONBOARDING_KEY = "voice_onboarding_seen";

/** sessionStorage flag set after we showed the "✓ Mikrofon aktiviert"
 *  toast in this browser-tab session. Per-session (not per-device) so
 *  a user who revoked + re-granted in Chrome settings still sees the
 *  confirmation when they come back to the tab in a new session. */
const SESSION_TOAST_KEY = "voice_session_toast_shown";

/**
 * Probe the browser's microphone permission state.
 * Returns null when the Permissions API isn't available for `microphone`
 * (true on iOS Safari at the time of writing) — caller treats that as
 * "unknown" and falls through to start(), which triggers the native
 * permission prompt; recognition.onerror handles a denial.
 */
async function checkMicrophonePermission(): Promise<PermissionState | null> {
  if (typeof navigator === "undefined" || !navigator.permissions) return null;
  try {
    const status = await navigator.permissions.query({
      // "microphone" is widely shipped but not in every TS lib.dom version
      // of PermissionName, so we cast at the call site.
      name: "microphone" as PermissionName,
    });
    return status.state;
  } catch {
    return null;
  }
}

interface Props {
  /** Fires on every interim/final result with the running transcript. */
  onTranscript: (text: string) => void;
  /** Fires once when recording ends with the final transcript. */
  onFinal: (text: string) => void;
  disabled?: boolean;
  /** When true, this feature is gated behind premium. */
  premium?: boolean;
  /** The user's premium status. If `premium && !isPremium`, click leads
   *  to /#preise instead of starting recording. Defaults to true so
   *  parents that already gate visibility don't have to pass this. */
  isPremium?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function VoiceInputButton({
  onTranscript,
  onFinal,
  disabled,
  premium = false,
  isPremium = true,
  size = "md",
  className,
}: Props) {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);

  // Modal state. Both modals are mutually exclusive — onboarding leads to
  // either start (success) or help (denied), never both at once.
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Tracks user intent vs. browser-driven onend. Without this, iOS Safari's
  // pause-driven onend would prematurely flip the UI back to "stopped".
  const intentRef = useRef<"on" | "off">("off");
  const transcriptRef = useRef<string>("");
  const sessionStartRef = useRef<number>(0);
  /** Flips to true the moment the user accepts onboarding; consumed by
   *  recognition.onstart to gate the one-shot success toast. Without this
   *  flag we'd also toast on every silent recording start. */
  const justGrantedRef = useRef<boolean>(false);

  useEffect(() => {
    setSupported(getSpeechRecognition() !== null);
  }, []);

  // Cleanup on unmount — strip handlers first so a final onend doesn't
  // race the unmount and call onFinal on a dead component.
  useEffect(() => {
    return () => {
      const r = recognitionRef.current;
      if (!r) return;
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
      r.onstart = null;
      try {
        r.abort();
      } catch {
        /* ignore — already torn down */
      }
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    intentRef.current = "off";
    setRecording(false);
    const r = recognitionRef.current;
    if (r) {
      try {
        r.stop();
      } catch {
        /* not started yet */
      }
    }
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;

    transcriptRef.current = "";
    sessionStartRef.current = Date.now();

    recognition.onstart = () => {
      // Show the "✓ Mikrofon aktiviert" toast once per browser-tab session
      // and only when this start was preceded by a permission check that
      // resolved positively (justGrantedRef set in startWithPermissionCheck).
      // iOS Safari auto-restarts the recognition on silence pauses; those
      // re-fire onstart on the same instance — sessionStorage gating
      // prevents double-toasting in that case.
      if (!justGrantedRef.current) return;
      justGrantedRef.current = false;
      try {
        if (typeof window === "undefined") return;
        if (sessionStorage.getItem(SESSION_TOAST_KEY) === "true") return;
        toast.success("✓ Mikrofon aktiviert");
        sessionStorage.setItem(SESSION_TOAST_KEY, "true");
      } catch {
        // sessionStorage unavailable — toast simply won't fire again.
      }
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      transcriptRef.current = transcript;
      onTranscript(transcript);
    };

    recognition.onerror = (event) => {
      const code = event.error;
      if (code === "no-speech") {
        toast("Nichts gehört. Sprich etwas lauter.");
      } else if (code === "audio-capture") {
        toast.error("Mikrofon nicht verfügbar.");
      } else if (code === "not-allowed" || code === "service-not-allowed") {
        // Native prompt was rejected, OR permission was already 'denied'
        // but permissions.query failed/unsupported (Safari iOS) so we
        // skipped the help modal earlier. Show it now. Reset the toast
        // gate so a future grant doesn't fire a stale "✓ Mikrofon aktiviert".
        justGrantedRef.current = false;
        setHelpOpen(true);
      } else {
        toast.error(`Spracherkennung-Fehler: ${code}`);
      }
      intentRef.current = "off";
      setRecording(false);
    };

    recognition.onend = () => {
      // iOS Safari ends after pauses. If the user still wants to record and
      // we haven't hit the cap, silently restart the same recognition.
      if (
        intentRef.current === "on" &&
        Date.now() - sessionStartRef.current < MAX_SESSION_MS
      ) {
        try {
          recognition.start();
          return;
        } catch {
          /* engine not ready, fall through */
        }
      }
      setRecording(false);
      intentRef.current = "off";
      onFinal(transcriptRef.current);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      intentRef.current = "on";
      setRecording(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unbekannt";
      toast.error(`Spracherkennung konnte nicht gestartet werden: ${msg}`);
      intentRef.current = "off";
      setRecording(false);
    }
  }, [onTranscript, onFinal]);

  /**
   * Permission-aware start. Re-queries the Permissions API on every
   * invocation — explicitly NO state cache, NO localStorage memory of
   * previous denials. This is the key invariant: if the user revoked
   * then re-granted microphone access via the browser settings, the
   * very next click reflects the new state.
   *
   * - 'granted': start immediately
   * - 'prompt' : call start(), browser will show its native prompt
   * - 'denied' : open the help modal, don't touch the mic
   * - null     : Permissions API unsupported (iOS Safari for "microphone").
   *              Fall through to start(); recognition.onerror catches
   *              "not-allowed" if the user has denied previously.
   *
   * For all paths that proceed to start() we mark justGrantedRef so the
   * next successful onstart can fire the once-per-session toast.
   */
  const startWithPermissionCheck = useCallback(async () => {
    const state = await checkMicrophonePermission();
    if (state === "denied") {
      setHelpOpen(true);
      return;
    }
    justGrantedRef.current = true;
    start();
  }, [start]);

  const handleClick = useCallback(async () => {
    if (disabled) return;

    if (premium && !isPremium) {
      toast("Sprach-Eingabe ist Teil von Premium");
      router.push("/#preise");
      return;
    }

    if (recording) {
      stop();
      return;
    }

    // First-ever click on this device: show onboarding before any mic call.
    let onboardingSeen = false;
    try {
      onboardingSeen =
        typeof window !== "undefined" &&
        localStorage.getItem(ONBOARDING_KEY) === "true";
    } catch {
      // localStorage blocked → skip onboarding silently to avoid trapping
      // the user behind a modal that can never be marked as seen.
      onboardingSeen = true;
    }

    if (!onboardingSeen) {
      setOnboardingOpen(true);
      return;
    }

    await startWithPermissionCheck();
  }, [
    disabled,
    premium,
    isPremium,
    recording,
    router,
    stop,
    startWithPermissionCheck,
  ]);

  const handleOnboardingAccept = useCallback(async () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      // localStorage blocked — proceed without persisting. User may see
      // onboarding again next visit, but they'll still get to record now.
    }
    setOnboardingOpen(false);
    // justGrantedRef gets set inside startWithPermissionCheck once the
    // actual permission state is known. Setting it here unconditionally
    // would cause a stale toast if the permission turns out to be denied.
    await startWithPermissionCheck();
  }, [startWithPermissionCheck]);

  const handleOnboardingCancel = useCallback(() => {
    setOnboardingOpen(false);
  }, []);

  const handleHelpClose = useCallback(() => {
    setHelpOpen(false);
  }, []);

  // Graceful degradation: Firefox + browsers without Web Speech API.
  if (!supported) return null;

  // Sizes — md=44 hits the iOS touch-target minimum; sm=36 matches the
  // chat send button so the two sit flush.
  const dim = size === "sm" ? "w-9 h-9" : "w-11 h-11";
  const iconSize = size === "sm" ? "w-4 h-4" : "w-[18px] h-[18px]";

  const baseClasses =
    "flex items-center justify-center rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0";
  const stateClasses = recording
    ? "bg-red-500/10 border-red-500/40 text-red-600 voice-recording"
    : "bg-white border-border text-ink-muted hover:border-primary/40 hover:text-primary hover:bg-primary-pale/40";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={
          recording ? "Höre zu… Klicke zum Stoppen" : "Sprich deine Eingabe"
        }
        aria-label={recording ? "Aufnahme stoppen" : "Sprach-Eingabe starten"}
        aria-pressed={recording}
        className={`${dim} ${baseClasses} ${stateClasses} ${className ?? ""}`}
      >
        {recording ? (
          <MicOff className={iconSize} />
        ) : (
          <Mic className={iconSize} />
        )}
      </button>

      {onboardingOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="voice-onboarding-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={handleOnboardingCancel}
        >
          <div
            className="bg-white rounded-2xl shadow-pop max-w-sm w-full p-6 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="voice-onboarding-title"
              className="font-serif text-lg text-ink mb-2"
            >
              🎤 Sprach-Eingabe aktivieren
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed mb-5">
              Nutriva braucht einmalig Zugriff auf dein Mikrofon. Audio
              wird nicht gespeichert — direkter Browser-zu-Apple/Google Pfad.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleOnboardingCancel}
                className="text-sm font-medium border border-border hover:bg-surface-muted text-ink-muted px-4 py-2 rounded-full transition"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleOnboardingAccept}
                className="text-sm font-medium bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-full transition"
              >
                Mikrofon erlauben
              </button>
            </div>
          </div>
        </div>
      )}

      {helpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="voice-help-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={handleHelpClose}
        >
          <div
            className="bg-white rounded-2xl shadow-pop max-w-md w-full p-6 border border-border max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="voice-help-title"
              className="font-serif text-lg text-ink mb-2"
            >
              Mikrofon ist blockiert
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed mb-4">
              Dein Browser hat den Mikrofon-Zugriff für diese Seite gesperrt.
              So kannst du ihn wieder aktivieren:
            </p>

            <div className="space-y-4 mb-5">
              <div>
                <p className="text-sm font-semibold text-ink mb-1">iOS Safari</p>
                <ol className="text-xs text-ink-muted leading-relaxed list-decimal pl-4 space-y-0.5">
                  <li>
                    Tippe in der Adressleiste auf das{" "}
                    <strong>AA-Symbol</strong> (links neben der URL)
                  </li>
                  <li>
                    Wähle „Webseiten-Einstellungen&ldquo; → „Mikrofon&ldquo;
                  </li>
                  <li>Setze auf „Erlauben&ldquo; und lade die Seite neu</li>
                </ol>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink mb-1">
                  Android Chrome
                </p>
                <ol className="text-xs text-ink-muted leading-relaxed list-decimal pl-4 space-y-0.5">
                  <li>
                    Tippe in der Adressleiste auf das{" "}
                    <strong>Schloss-Symbol</strong> links neben der URL
                  </li>
                  <li>Wähle „Berechtigungen&ldquo; → „Mikrofon&ldquo;</li>
                  <li>
                    Aktiviere die Berechtigung und lade die Seite neu
                  </li>
                </ol>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink mb-1">
                  Desktop (Chrome / Edge / Safari / Firefox)
                </p>
                <ol className="text-xs text-ink-muted leading-relaxed list-decimal pl-4 space-y-0.5">
                  <li>
                    Klicke in der Adressleiste auf das{" "}
                    <strong>Schloss-Symbol</strong> oder das Site-Info-Symbol
                  </li>
                  <li>Setze „Mikrofon&ldquo; auf „Erlauben&ldquo;</li>
                  <li>Lade die Seite neu (⌘R / Strg+R)</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleHelpClose}
                className="text-sm font-medium bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-full transition"
              >
                OK, hab&rsquo;s gesehen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
