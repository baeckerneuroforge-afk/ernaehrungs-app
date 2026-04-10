"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Placement = "top" | "bottom";

interface Step {
  target: string; // data-tour value
  title: string;
  body: string;
  hint?: string; // optional small chip below the body
  plan?: string; // optional context text shown only for free users
}

const STEPS: Step[] = [
  {
    target: "chat-input",
    title: "Willkommen bei Nutriva!",
    body: "Hier kannst du jede Ernährungsfrage stellen. Die KI kennt dein Profil und gibt dir persönliche Antworten — basierend auf wissenschaftlichem Fachwissen.",
    hint: "Probier’s aus: „Was sollte ich zum Frühstück essen?“",
  },
  {
    target: "plan",
    title: "Dein persönlicher Ernährungsplan",
    body: "Lass dir einen 7-Tage-Plan erstellen — mit Fastenmodell, Mahlzeitenanzahl und Mealprep. Abgestimmt auf dein Kalorienziel und deine Vorlieben.",
    plan: "Ab dem Basis-Plan verfügbar",
  },
  {
    target: "tagebuch",
    title: "Dein Ernährungstagebuch",
    body: "Trage ein was du isst. Je mehr die KI über deine Ernährung weiß, desto persönlicher werden die Empfehlungen — mit jedem Tag ein bisschen besser.",
  },
  {
    target: "tracker",
    title: "Gewicht & Ziele tracken",
    body: "Behalte deinen Fortschritt im Blick. Dein Gewichtsverlauf fließt in den Wochenreview ein — sachlich und ohne Bewertung.",
  },
  {
    target: "credits",
    title: "Deine Credits",
    body: "Jede Chat-Frage kostet 1 Credit. Du hast 15 Credits zum Ausprobieren. Tippe auf den Badge, um deinen Verbrauch zu sehen oder Credits nachzukaufen.",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  userPlan?: string; // 'free' | 'pro' | 'pro_plus' | 'admin'
}

export function Walkthrough({ userPlan = "free" }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [placement, setPlacement] = useState<Placement>("bottom");
  const [isMobile, setIsMobile] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  // Track viewport size
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Find the target element's position
  const measureTarget = useCallback(() => {
    if (!step) return;
    const nodes = document.querySelectorAll<HTMLElement>(
      `[data-tour="${step.target}"]`
    );
    let best: HTMLElement | null = null;
    for (const node of Array.from(nodes)) {
      const r = node.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        best = node;
        break;
      }
    }
    if (!best) {
      setTargetRect(null);
      return;
    }
    const r = best.getBoundingClientRect();
    // Add a bit of padding around the spotlight
    const pad = 8;
    setTargetRect({
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });

    // Choose placement — above the element if there's more room above, else below
    const spaceAbove = r.top;
    const spaceBelow = window.innerHeight - r.bottom;
    setPlacement(spaceAbove > spaceBelow ? "top" : "bottom");
  }, [step]);

  useEffect(() => {
    if (!visible) return;
    measureTarget();
    // Remeasure on resize + scroll
    const handler = () => measureTarget();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    // Also remeasure shortly after mount — some targets (CreditBadge) fetch data async
    const t = setTimeout(measureTarget, 400);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
      clearTimeout(t);
    };
  }, [measureTarget, visible, stepIndex]);

  const finish = useCallback(async () => {
    setVisible(false);
    try {
      await fetch("/api/profile/tour-done", { method: "POST" });
    } catch {
      // noop — best-effort persist
    }
  }, []);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  // ESC to skip
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, skip]);

  const next = () => {
    if (isLast) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  if (!visible) return null;

  const hasSpotlight = targetRect !== null;

  // Compute card position
  let cardStyle: React.CSSProperties = {};
  if (hasSpotlight && targetRect && !isMobile) {
    const cardWidth = 360;
    const gap = 14;
    // Horizontal: center on target, clamp to viewport
    let left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - cardWidth - 16));
    let top: number;
    if (placement === "top") {
      top = targetRect.top - gap - 8; // card bottom lands gap above target
      cardStyle = { top, left, transform: "translateY(-100%)", width: cardWidth };
    } else {
      top = targetRect.top + targetRect.height + gap;
      cardStyle = { top, left, width: cardWidth };
    }
  } else if (hasSpotlight && targetRect && isMobile) {
    // Mobile: full-width-ish card, always below (or above if no room)
    const gap = 12;
    if (placement === "top") {
      cardStyle = {
        top: targetRect.top - gap,
        left: 16,
        right: 16,
        transform: "translateY(-100%)",
      };
    } else {
      cardStyle = {
        top: targetRect.top + targetRect.height + gap,
        left: 16,
        right: 16,
      };
    }
  } else {
    // Fallback: centered card (no target found on this page)
    cardStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: isMobile ? "calc(100% - 32px)" : 380,
      maxWidth: 380,
    };
  }

  return (
    <div
      className="fixed inset-0 z-[100]"
      aria-live="polite"
      aria-label="Onboarding-Tour"
    >
      {/* Overlay — click outside = skip */}
      <div
        className="absolute inset-0 bg-black/40 motion-safe:transition-opacity motion-safe:duration-300 backdrop-blur-[2px]"
        onClick={skip}
      />

      {/* Spotlight "hole" — a fixed box with huge inverse box-shadow */}
      {hasSpotlight && targetRect && (
        <div
          className="absolute rounded-xl pointer-events-none motion-safe:transition-all motion-safe:duration-300 ease-out"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.40)",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="absolute bg-white rounded-2xl shadow-xl border border-border p-5 sm:p-6 max-w-sm motion-safe:animate-fade-in"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="tour-title"
          className="font-serif text-lg text-primary leading-tight mb-2"
        >
          {step.title}
        </h2>
        <p className="text-sm text-stone-600 leading-relaxed">{step.body}</p>

        {step.hint && (
          <div className="mt-3 inline-block text-xs text-primary bg-primary-pale rounded-full px-3 py-1.5 leading-snug">
            {step.hint}
          </div>
        )}

        {step.plan && userPlan === "free" && (
          <p className="mt-2 text-[11px] text-ink-faint italic">{step.plan}</p>
        )}

        {/* Progress dots + actions */}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full motion-safe:transition-all ${
                  i === stepIndex
                    ? "bg-primary w-4"
                    : i < stepIndex
                      ? "bg-primary/50"
                      : "bg-stone-300"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={skip}
              className="text-sm text-stone-400 hover:text-stone-600 transition"
            >
              Überspringen
            </button>
            <button
              type="button"
              onClick={next}
              className="bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-full px-5 py-2 transition"
            >
              {isLast ? "Los geht's!" : "Weiter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
