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

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Tracks user intent vs. browser-driven onend. Without this, iOS Safari's
  // pause-driven onend would prematurely flip the UI back to "stopped".
  const intentRef = useRef<"on" | "off">("off");
  const transcriptRef = useRef<string>("");
  const sessionStartRef = useRef<number>(0);

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
        toast.error(
          "Mikrofon-Zugriff wurde verweigert. Aktiviere ihn in den Browser-Einstellungen.",
        );
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
          /* start() throws if the engine hasn't fully torn down yet —
             fall through to "stopped" below. */
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
    } catch {
      toast.error("Spracherkennung konnte nicht gestartet werden.");
      intentRef.current = "off";
      setRecording(false);
    }
  }, [onTranscript, onFinal]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (premium && !isPremium) {
      toast("Sprach-Eingabe ist Teil von Premium");
      router.push("/#preise");
      return;
    }
    if (recording) {
      stop();
    } else {
      start();
    }
  }, [disabled, premium, isPremium, recording, router, start, stop]);

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
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={
        recording ? "Höre zu… Klicke zum Stoppen" : "Sprich deine Eingabe"
      }
      aria-label={
        recording ? "Aufnahme stoppen" : "Sprach-Eingabe starten"
      }
      aria-pressed={recording}
      className={`${dim} ${baseClasses} ${stateClasses} ${className ?? ""}`}
    >
      {recording ? (
        <MicOff className={iconSize} />
      ) : (
        <Mic className={iconSize} />
      )}
    </button>
  );
}
