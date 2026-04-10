"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  ArrowRight,
  Check,
  ChevronDown,
  MessageCircle,
  CalendarDays,
  BookOpen,
  TrendingUp,
  Send,
  Sparkles,
  Shield,
  GraduationCap,
  FlaskConical,
  Heart,
  Leaf,
  Clock,
  Crown,
  Salad,
  Scale,
  Apple,
  BarChart3,
  Baby,
  Wheat,
  Camera,
  ShoppingBasket,
  UtensilsCrossed,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   SCROLL REVEAL HOOK
   ═══════════════════════════════════════════════════════════════ */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("js-reveal");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px 50px 0px" }
    );
    requestAnimationFrame(() => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-bg overflow-x-hidden">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <TrustBar />
        <HowItWorksSection />
        <FeaturesSection />
        <PhotoAiSection />
        <ClosedLoopSection />
        <ExampleQuestionsSection />
        <PricingSection />
        <JanineSection />
        <FaqSection />
        <CtaFooterSection />
      </main>
      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   1. HERO
   ═══════════════════════════════════════════════════════════════ */
function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const revealRef = useScrollReveal();
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const el = phoneRef.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [videoFailed]);

  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center overflow-hidden dark:bg-[#1C1917]">
      {/* Organic background blobs */}
      <div
        aria-hidden
        className="dark-blob-dim absolute top-[-15%] right-[-10%] w-[720px] h-[720px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(226,240,219,0.9), rgba(226,240,219,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="dark-blob-dim absolute bottom-[-25%] left-[-15%] w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(245,237,228,0.8), rgba(245,237,228,0) 70%)",
        }}
      />
      {/* Subtle dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(45,106,79,0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div ref={revealRef} className="reveal relative w-full max-w-6xl mx-auto px-5 sm:px-6 pt-24 pb-16 lg:pt-28 lg:pb-24">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-20 items-center">
          {/* Left — Copy */}
          <div className="relative z-10 max-w-full lg:max-w-xl">
            <div className="anim-fade-up inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-sage-light/60 rounded-full px-4 py-1.5 mb-7 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wide">
                Fundierte Ernährungsberatung
              </span>
            </div>

            <h1
              lang="de"
              className="font-serif font-semibold text-warm-dark leading-[1.05] tracking-tight mb-6 text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl [hyphens:manual] anim-fade-up delay-1"
            >
              Deine Ernährungs&shy;beraterin.
              <br />
              <span
                className="inline-block bg-gradient-to-r from-primary via-primary-light to-sage bg-clip-text text-transparent italic pr-2"
                style={{ fontFeatureSettings: "'ss01'" }}
              >
                Immer dabei.
              </span>
            </h1>

            <p className="anim-fade-up delay-2 text-base sm:text-xl text-warm-muted leading-relaxed mb-8 sm:mb-10 max-w-full sm:max-w-lg font-light">
              Frag was dich bewegt. Die Antwort kennt dein Ziel, deine Allergien
              und deinen Alltag.
            </p>

            <div className="anim-fade-up delay-3 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-2.5 bg-primary text-white px-8 sm:px-9 py-3.5 sm:py-4 rounded-full font-medium text-base hover:bg-primary-hover hover:scale-[1.03] active:scale-95 transition-all duration-200 shadow-xl shadow-primary/25"
              >
                Kostenlos starten
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-border rounded-full px-4 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-warm-muted">
                  Kein Abo nötig · 15 Credits gratis
                </span>
              </div>
            </div>
          </div>

          {/* Right — Video (Remotion video already contains its own phone frame) */}
          <div className="relative flex justify-center lg:justify-end mt-8 lg:mt-0">
            <div
              aria-hidden
              className="absolute -top-10 -right-10 w-80 h-80 border border-sage-light/60 rounded-full hidden lg:block"
            />
            <div
              aria-hidden
              className="absolute -bottom-6 -left-6 w-40 h-40 border border-accent-warmLight/40 rounded-full hidden lg:block"
            />

            <div
              ref={phoneRef}
              className="anim-scale-up delay-2 relative w-full max-w-[250px] sm:max-w-[300px] lg:max-w-[360px]"
            >
            <div className="relative motion-safe:[transform:rotate(-2deg)]">
              {!videoFailed ? (
                <video
                  ref={videoRef}
                  src="/ernaehrungsapp-demo.mp4"
                  poster="/video-poster.svg"
                  preload="metadata"
                  autoPlay
                  muted
                  loop
                  playsInline
                  onError={() => setVideoFailed(true)}
                  className="w-full aspect-[9/19.5] object-cover rounded-3xl shadow-2xl shadow-black/25 dark:shadow-black/60"
                />
              ) : (
                <div className="rounded-3xl overflow-hidden shadow-2xl shadow-black/25 dark:shadow-black/60 bg-[#F0F7EC]">
                  <HeroFallback />
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroFallback() {
  return (
    <div className="flex flex-col">
      <div className="bg-primary px-4 pt-10 pb-3 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
          <Leaf className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-white font-medium text-xs">Ernährungsberatung</p>
          <p className="text-white/60 text-[10px]">Online</p>
        </div>
      </div>
      <div className="bg-surface-bg px-3 py-4 space-y-3 min-h-[320px]">
        <div className="flex justify-end">
          <div className="bg-primary text-white px-3 py-2.5 rounded-2xl rounded-br-sm max-w-[85%]">
            <p className="text-xs leading-relaxed">
              Was kann ich als Snack essen wenn ich Laktoseintoleranz habe?
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-lg bg-sage-pale flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-3 h-3 text-primary" />
          </div>
          <div className="bg-white border border-warm-border/80 px-3 py-2.5 rounded-2xl rounded-bl-sm max-w-[88%] shadow-sm">
            <p className="text-xs text-warm-text leading-relaxed mb-2 font-medium">
              Hier sind 5 leckere Snack-Ideen für dich:
            </p>
            <ul className="text-xs text-warm-muted space-y-0.5">
              <li>1. Nüsse &amp; Trockenfrüchte-Mix</li>
              <li>2. Reiswaffeln mit Avocado</li>
              <li>3. Dunkle Schokolade (ab 70%)</li>
              <li>4. Hummus mit Gemüsesticks</li>
              <li>5. Laktosefreier Joghurt mit Beeren</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="px-3 py-2.5 border-t border-warm-border/60 bg-white flex items-center gap-2">
        <div className="flex-1 bg-surface-muted rounded-xl px-3 py-2">
          <p className="text-[10px] text-warm-light">Stelle eine Frage…</p>
        </div>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Send className="w-3 h-3 text-white" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. TRUST BAR
   ═══════════════════════════════════════════════════════════════ */
function TrustBar() {
  const ref = useScrollReveal();
  const items = [
    {
      icon: <GraduationCap className="w-5 h-5" />,
      title: "Studierte Ernährungswissenschaftlerin",
      body: "Kuratiert von Janine — mit Studium und Praxis",
    },
    {
      icon: <FlaskConical className="w-5 h-5" />,
      title: "12 kuratierte Quellen",
      body: "Wissenschaftlich fundiert, laufend aktualisiert",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "DSGVO-konform",
      body: "Daten bleiben sicher — kein Namens-Tracking",
    },
  ];

  return (
    <div className="relative bg-white dark:bg-[#292524] border-y border-border/60 dark:border-[#44403C] shadow-[0_4px_20px_-10px_rgba(28,25,23,0.06)]">
      <div
        ref={ref}
        className="reveal-stagger max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8"
      >
        {items.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3.5 sm:justify-center"
          >
            <div className="w-11 h-11 rounded-2xl bg-primary-pale text-primary flex items-center justify-center flex-shrink-0">
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-warm-dark leading-tight">
                {item.title}
              </p>
              <p className="text-xs text-warm-muted mt-0.5 leading-relaxed">
                {item.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. HOW IT WORKS — Zig-Zag with mini app mockups
   ═══════════════════════════════════════════════════════════════ */
function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      title: "Profil anlegen",
      desc: "Ziele, Allergien, Ernährungsform — dauert 2 Minuten. Alles was die KI braucht, um dich wirklich zu verstehen.",
      mockup: <ProfileMockup />,
    },
    {
      num: "02",
      title: "Frage stellen",
      desc: "Chatte mit deiner KI-Beraterin. Sie kennt dein Profil und gibt dir Antworten, die wirklich zu dir passen.",
      mockup: <ChatMockup />,
    },
    {
      num: "03",
      title: "Tagebuch führen",
      desc: "Erfasse was du isst. Je mehr die KI über deine Ernährung weiß, desto persönlicher werden die Empfehlungen.",
      mockup: <TagebuchMockup />,
    },
    {
      num: "04",
      title: "Besser essen",
      desc: "Erhalte Wochenpläne und sanfte Wochenreviews. Jede Woche ein Stück besser — ohne Druck.",
      mockup: <PlanMockup />,
    },
  ];

  return (
    <section className="relative py-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center mb-20">
        <p className="text-xs font-semibold text-primary tracking-[0.2em] uppercase mb-3">
          So funktioniert&apos;s
        </p>
        <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-warm-dark leading-[1.08] tracking-tight">
          In vier Schritten zu
          <br />
          <span className="italic text-primary">besserer Ernährung</span>
        </h2>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16 sm:space-y-24">
        {steps.map((s, i) => {
          const reversed = i % 2 === 1;
          return (
            <HowItWorksStep key={s.num}>
              {/* Text — on mobile always below mockup */}
              <div className={`${reversed ? "anim-fade-right" : "anim-fade-left"} order-2 ${reversed ? "md:order-2 md:text-right md:pl-6" : "md:order-1 md:pr-6"} relative`}>
                <span
                  aria-hidden
                  className="font-serif text-[7rem] sm:text-[9rem] leading-none font-semibold text-primary-pale absolute -top-8 -z-10 select-none"
                  style={reversed ? { right: "-0.25rem" } : { left: "-0.25rem" }}
                >
                  {s.num}
                </span>
                <span className="inline-block text-[11px] font-semibold text-primary tracking-widest uppercase mb-3 bg-primary-pale rounded-full px-3 py-1">
                  Schritt {s.num}
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-warm-dark mb-4 leading-tight">
                  {s.title}
                </h3>
                <p className={`text-warm-muted leading-relaxed max-w-md ${reversed ? "md:ml-auto" : ""}`}>
                  {s.desc}
                </p>
              </div>

              {/* Mockup */}
              <div className={`anim-scale-up delay-2 order-1 ${reversed ? "md:order-1" : "md:order-2"} flex justify-center`}>
                <div className="relative">
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-primary-pale rounded-3xl blur-2xl opacity-60 dark:opacity-30 -z-10"
                  />
                  {s.mockup}
                </div>
              </div>
            </HowItWorksStep>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorksStep({ children }: { children: React.ReactNode }) {
  const ref = useScrollReveal();
  return (
    <div
      ref={ref}
      className="reveal relative grid md:grid-cols-2 gap-8 md:gap-14 items-center"
    >
      {children}
    </div>
  );
}

/* ---- Mini mockups ---- */
function MockupFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-border shadow-xl shadow-black/[0.06] p-5 w-[280px] sm:w-[320px]">
      {children}
    </div>
  );
}

function ProfileMockup() {
  return (
    <MockupFrame>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary-pale text-primary flex items-center justify-center font-serif font-semibold">
          L
        </div>
        <div>
          <p className="text-sm font-semibold text-warm-dark">Lisa</p>
          <p className="text-[10px] text-warm-light">Profil</p>
        </div>
      </div>
      <div className="space-y-2.5">
        <MiniField label="Ziel" value="Gewicht halten" />
        <MiniField label="Ernährungsform" value="Vegetarisch" />
        <div>
          <p className="text-[10px] text-warm-light uppercase tracking-wider mb-1.5">
            Allergien
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["Laktose", "Nüsse", "Gluten"].map((a) => (
              <span
                key={a}
                className="text-[10px] bg-accent-warmPale text-accent-warm border border-accent-warmLight/60 rounded-full px-2.5 py-0.5 font-medium"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-muted rounded-xl px-3 py-2">
      <p className="text-[9px] text-warm-light uppercase tracking-wider">{label}</p>
      <p className="text-xs font-medium text-warm-dark">{value}</p>
    </div>
  );
}

function ChatMockup() {
  return (
    <MockupFrame>
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <Leaf className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-xs font-semibold text-warm-dark">KI-Beraterin</p>
        <span className="ml-auto text-[9px] text-primary bg-primary-pale rounded-full px-2 py-0.5">
          Online
        </span>
      </div>
      <div className="space-y-2.5">
        <div className="flex justify-end">
          <div className="bg-primary text-white rounded-2xl rounded-br-md px-3 py-2 max-w-[85%]">
            <p className="text-[11px] leading-snug">
              Was kann ich abends essen?
            </p>
          </div>
        </div>
        <div className="flex">
          <div className="bg-surface-muted rounded-2xl rounded-bl-md px-3 py-2 max-w-[88%]">
            <p className="text-[11px] text-warm-dark leading-snug">
              Leichte Proteine wie Magerquark oder ein Omelett mit Gemüse —
              sättigend, ohne zu belasten.
            </p>
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

function TagebuchMockup() {
  const entries = [
    { time: "08:12", meal: "Haferflocken mit Beeren", kcal: 340 },
    { time: "12:45", meal: "Linsensuppe mit Brot", kcal: 480 },
    { time: "15:30", meal: "Apfel + Mandeln", kcal: 210 },
  ];
  return (
    <MockupFrame>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] text-warm-light uppercase tracking-wider">
            Heute
          </p>
          <p className="text-sm font-semibold text-warm-dark">Mittwoch</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-serif font-semibold text-primary leading-none">
            1.030
          </p>
          <p className="text-[9px] text-warm-light">/ 1.800 kcal</p>
        </div>
      </div>
      <div className="h-1.5 bg-surface-muted rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: "57%" }} />
      </div>
      <div className="space-y-2">
        {entries.map((e) => (
          <div
            key={e.time}
            className="flex items-center gap-2.5 bg-surface-muted/60 rounded-xl px-2.5 py-1.5"
          >
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <Apple className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-warm-dark truncate">
                {e.meal}
              </p>
              <p className="text-[9px] text-warm-light">{e.time}</p>
            </div>
            <p className="text-[10px] text-warm-muted font-medium">
              {e.kcal}
            </p>
          </div>
        ))}
      </div>
    </MockupFrame>
  );
}

function PlanMockup() {
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  return (
    <MockupFrame>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-warm-dark">Woche 14</p>
        </div>
        <span className="text-[9px] bg-accent-warmPale text-accent-warm rounded-full px-2 py-0.5 font-medium">
          16:8
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-3">
        {days.map((d, i) => (
          <div key={d} className="text-center">
            <p className="text-[9px] text-warm-light mb-1">{d}</p>
            <div
              className={`h-1.5 rounded-full ${
                i < 3 ? "bg-primary" : "bg-surface-muted"
              }`}
            />
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <MiniMealRow meal="Frühstück" label="Overnight Oats" />
        <MiniMealRow meal="Mittag" label="Quinoa-Bowl" />
        <MiniMealRow meal="Abend" label="Ofengemüse" />
      </div>
    </MockupFrame>
  );
}

function MiniMealRow({ meal, label }: { meal: string; label: string }) {
  return (
    <div className="flex items-center justify-between bg-surface-muted/60 rounded-lg px-2.5 py-1.5">
      <p className="text-[10px] text-warm-light uppercase tracking-wider">
        {meal}
      </p>
      <p className="text-[11px] font-medium text-warm-dark">{label}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. FEATURES
   ═══════════════════════════════════════════════════════════════ */
function FeaturesSection() {
  const ref = useScrollReveal();

  return (
    <section className="relative bg-gradient-to-b from-sage-faint/50 via-surface-bg to-surface-bg border-y border-sage-light/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-28">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-primary tracking-[0.2em] uppercase mb-3">
            Funktionen
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-warm-dark mb-5 tracking-tight leading-tight">
            Alles für bessere Ernährung
          </h2>
          <p className="text-warm-muted max-w-lg mx-auto leading-relaxed font-light text-lg">
            Fundiertes Wissen, individuell auf dich abgestimmt — wie eine
            persönliche Beratung, die immer für dich da ist.
          </p>
        </div>

        <div
          ref={ref}
          className="reveal-stagger grid md:grid-cols-3 gap-6"
        >
          <FeatureCard
            icon={<MessageCircle className="w-5 h-5" />}
            title="Chat mit KI-Beraterin"
            description="Stelle jede Frage rund um Ernährung. Sofort fundierte Antworten — basierend auf deinem Profil, Tagebuch und Zielen."
            preview={<ChatPreview />}
            badge={
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-accent-warm to-amber-600 text-white shadow-md shadow-amber-600/20">
                <Camera className="w-2.5 h-2.5" />
                Neu: Foto-Analyse
              </span>
            }
          />
          <FeatureCard
            icon={<CalendarDays className="w-5 h-5" />}
            title="Dein Ernährungsplan"
            description="KI-generierte Wochenpläne abgestimmt auf deine Ziele, Allergien, Vorlieben und dein echtes Essverhalten."
            preview={<PlanPreview />}
          />
          <FeatureCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Wochenreview"
            description="Jeden Sonntag: Was lief gut, was kannst du verbessern, Fokus für die nächste Woche. Warmherzig und fachlich."
            preview={<ReviewPreview />}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  preview,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  preview: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="relative group bg-white rounded-3xl border border-border p-7 hover:shadow-2xl hover:shadow-primary/[0.08] hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 flex flex-col">
      {badge && (
        <div className="absolute -top-3 right-5 z-10">{badge}</div>
      )}
      {/* Preview */}
      <div className="bg-gradient-to-br from-primary-faint to-sage-faint dark:from-[#142820] dark:to-[#1a3328] rounded-2xl p-4 mb-6 h-36 flex items-center justify-center overflow-hidden">
        {preview}
      </div>
      <div className="w-11 h-11 rounded-2xl bg-primary-pale text-primary group-hover:bg-primary group-hover:text-white flex items-center justify-center mb-4 transition-colors duration-300">
        {icon}
      </div>
      <h3 className="font-serif text-xl font-semibold text-warm-dark mb-2.5 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-warm-muted leading-relaxed flex-1">
        {description}
      </p>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-end">
        <div className="bg-primary text-white text-[10px] rounded-xl rounded-br-sm px-2.5 py-1.5 max-w-[80%]">
          Wie viel Protein brauche ich?
        </div>
      </div>
      <div className="flex">
        <div className="bg-white border border-border text-[10px] rounded-xl rounded-bl-sm px-2.5 py-1.5 max-w-[85%] shadow-sm">
          <p className="text-warm-dark font-medium">Bei deinem Profil: ca. 1,2 g / kg Körpergewicht.</p>
          <p className="text-warm-muted mt-0.5">Das entspricht ~84 g pro Tag.</p>
        </div>
      </div>
    </div>
  );
}

function PlanPreview() {
  const days = ["M", "D", "M", "D", "F", "S", "S"];
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] text-warm-muted uppercase tracking-wider font-semibold">Woche</p>
        <span className="text-[9px] bg-white border border-border rounded-full px-1.5 py-0.5 text-warm-muted">
          16:8
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map((d, i) => (
          <div key={i} className="text-center">
            <p className="text-[8px] text-warm-light mb-0.5">{d}</p>
            <div className="h-6 rounded bg-white border border-border flex items-center justify-center">
              <div className={`w-2 h-2 rounded-full ${i < 4 ? "bg-primary" : "bg-sage-light"}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-border rounded-lg px-2 py-1 text-[9px] text-warm-muted">
        Heute: Quinoa-Bowl · 520 kcal
      </div>
    </div>
  );
}

function ReviewPreview() {
  const blocks = [
    { icon: <Scale className="w-3 h-3" />, label: "Gewicht", value: "−0,4 kg" },
    { icon: <Salad className="w-3 h-3" />, label: "Ziel", value: "82%" },
    { icon: <BarChart3 className="w-3 h-3" />, label: "Woche", value: "Gut" },
  ];
  return (
    <div className="w-full space-y-1.5">
      <p className="text-[9px] text-warm-muted uppercase tracking-wider font-semibold mb-1.5">
        Sonntagsreview
      </p>
      {blocks.map((b) => (
        <div
          key={b.label}
          className="flex items-center gap-2 bg-white border border-border rounded-lg px-2 py-1.5"
        >
          <div className="w-5 h-5 rounded bg-primary-pale text-primary flex items-center justify-center">
            {b.icon}
          </div>
          <p className="text-[10px] text-warm-muted flex-1">{b.label}</p>
          <p className="text-[10px] font-semibold text-warm-dark">{b.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4b. PHOTO AI — Premium feature spotlight
   ═══════════════════════════════════════════════════════════════ */
function PhotoAiSection() {
  const ref = useScrollReveal();

  const useCases = [
    {
      icon: <UtensilsCrossed className="w-5 h-5" />,
      title: "Speisekarte fotografieren",
      desc: "Im Restaurant? Schick ein Foto der Karte. Die KI sagt dir, was zu deinem Ziel passt — inklusive Kalorienbudget für den Rest des Tages.",
    },
    {
      icon: <Camera className="w-5 h-5" />,
      title: "Essen fotografieren",
      desc: "Foto machen, fertig. Kalorien, Protein und Makros werden automatisch erkannt und ins Tagebuch eingetragen.",
    },
    {
      icon: <ShoppingBasket className="w-5 h-5" />,
      title: "Zutatenliste scannen",
      desc: "Verpackung abfotografieren und sofort wissen: Passt das zu meinem Ziel? Was wäre eine bessere Alternative?",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-white border-y border-accent-warmLight/30">
      {/* Subtle amber/gold gradient blobs */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 85% 20%, rgba(245,212,155,0.25) 0%, rgba(245,212,155,0) 55%), radial-gradient(ellipse at 15% 80%, rgba(253,230,192,0.3) 0%, rgba(253,230,192,0) 60%)",
        }}
      />

      <div ref={ref} className="reveal relative max-w-6xl mx-auto px-4 sm:px-6 py-28">
        <div className="grid md:grid-cols-[3fr_2fr] gap-12 lg:gap-16 items-center">
          {/* Left — Text + Use Cases */}
          <div className="anim-fade-left">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-warm tracking-[0.2em] uppercase mb-4">
              <Crown className="w-3 h-3" />
              Premium-Feature
            </p>
            <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-warm-dark mb-4 tracking-tight leading-[1.08]">
              Fotografieren
              <br />
              <span className="italic text-accent-warm">statt tippen.</span>
            </h2>
            <p className="text-warm-muted leading-relaxed font-light text-lg mb-10 max-w-xl">
              Schick ein Foto — die KI erledigt den Rest.
            </p>

            <div className="space-y-4 mb-10">
              {useCases.map((uc) => (
                <div
                  key={uc.title}
                  className="flex items-start gap-4 bg-white/80 backdrop-blur-sm border border-accent-warmLight/40 rounded-2xl p-4 sm:p-5 hover:border-accent-warm/50 hover:shadow-lg hover:shadow-amber-600/5 transition-all duration-300"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-warmPale to-amber-100 text-accent-warm flex items-center justify-center flex-shrink-0">
                    {uc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-lg font-semibold text-warm-dark mb-1 leading-snug">
                      {uc.title}
                    </p>
                    <p className="text-sm text-warm-muted leading-relaxed">
                      {uc.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="#preise"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-accent-warm to-amber-600 text-white px-6 py-3.5 rounded-full text-sm font-semibold hover:scale-[1.02] transition-all shadow-lg shadow-amber-600/25"
            >
              Premium entdecken
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Right — Phone mockup */}
          <div className="anim-fade-right delay-2 flex justify-center md:justify-end">
            <PhoneMockupPhotoChat />
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMockupPhotoChat() {
  return (
    <div className="relative">
      {/* Glow */}
      <div
        aria-hidden
        className="absolute -inset-6 bg-gradient-to-br from-accent-warm/15 to-amber-400/10 rounded-[3rem] blur-2xl"
      />
      {/* Phone frame */}
      <div className="relative w-[280px] sm:w-[300px] rounded-[2.5rem] bg-ink border-[10px] border-ink shadow-2xl">
        <div className="rounded-[1.75rem] overflow-hidden bg-surface-bg">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2 text-[10px] text-ink-muted font-semibold">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-1.5 bg-ink rounded-sm" />
              <span className="w-3 h-1.5 bg-ink rounded-sm" />
              <span className="w-4 h-1.5 bg-ink rounded-sm" />
            </div>
          </div>
          {/* Chat header */}
          <div className="px-4 py-2.5 border-b border-border bg-white/80 backdrop-blur flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Leaf className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-warm-dark leading-tight">Ernährungsassistent</p>
              <p className="text-[9px] text-primary leading-tight">● Online</p>
            </div>
            <span className="inline-flex items-center gap-0.5 text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r from-accent-warm to-amber-600 text-white">
              <Sparkles className="w-2 h-2" />
              Sonnet
            </span>
          </div>

          {/* Messages */}
          <div className="px-4 py-4 space-y-2.5 min-h-[340px] bg-gradient-to-b from-surface-bg to-white/50">
            {/* User bubble with image thumbnail */}
            <div className="flex justify-end">
              <div className="flex flex-col items-end gap-1 max-w-[80%]">
                {/* Fake menu thumbnail */}
                <div className="rounded-xl overflow-hidden shadow-md border border-border bg-white">
                  <div className="w-[140px] h-[90px] bg-gradient-to-br from-amber-50 via-white to-amber-100/60 p-2 flex flex-col justify-between">
                    <p className="text-[7px] font-serif font-bold text-warm-dark tracking-tight">RISTORANTE</p>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[6px] text-warm-dark font-medium">Lachsfilet</span>
                        <span className="text-[6px] text-warm-muted">18€</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[6px] text-warm-dark font-medium">Carbonara</span>
                        <span className="text-[6px] text-warm-muted">14€</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[6px] text-warm-dark font-medium">Caesar Salad</span>
                        <span className="text-[6px] text-warm-muted">12€</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[6px] text-warm-dark font-medium">Tiramisu</span>
                        <span className="text-[6px] text-warm-muted">7€</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-primary text-white text-[10px] rounded-2xl rounded-br-sm px-3 py-1.5 shadow-sm">
                  Was soll ich bestellen?
                </div>
              </div>
            </div>

            {/* Assistant bubble */}
            <div className="flex gap-1.5">
              <div className="w-6 h-6 rounded-full bg-primary-pale flex items-center justify-center flex-shrink-0">
                <Leaf className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-white border border-border text-[10px] rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm max-w-[85%]">
                <p className="text-warm-dark leading-snug">
                  Du hast noch <span className="font-semibold text-primary">850 kcal</span> übrig.
                </p>
                <p className="text-warm-dark leading-snug mt-1">
                  Nimm das <span className="font-semibold">Lachsfilet</span> (~620 kcal) — gutes Protein und passt perfekt.
                </p>
                <p className="text-warm-muted leading-snug mt-1">
                  Die Carbonara (~950 kcal) würde dein Budget sprengen.
                </p>
              </div>
            </div>

            {/* Typing indicator spacer */}
            <div className="flex gap-1.5 opacity-60">
              <div className="w-6 h-6 rounded-full bg-primary-pale flex items-center justify-center flex-shrink-0">
                <Leaf className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-white border border-border rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                <div className="flex gap-1 items-center h-3">
                  <span className="w-1 h-1 bg-primary/50 rounded-full animate-typing-dot" />
                  <span className="w-1 h-1 bg-primary/50 rounded-full animate-typing-dot [animation-delay:0.15s]" />
                  <span className="w-1 h-1 bg-primary/50 rounded-full animate-typing-dot [animation-delay:0.3s]" />
                </div>
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div className="px-3 py-2.5 border-t border-border bg-white flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-accent-warmLight/60 flex items-center justify-center flex-shrink-0">
              <Camera className="w-3 h-3 text-accent-warm" />
            </div>
            <div className="flex-1 h-7 rounded-full bg-surface-muted px-3 flex items-center">
              <span className="text-[9px] text-ink-faint">Frage stellen…</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <Send className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   5. CLOSED LOOP — horizontal flow
   ═══════════════════════════════════════════════════════════════ */
function ClosedLoopSection() {
  const ref = useScrollReveal();
  const steps = [
    {
      label: "Tagebuch",
      desc: "Du erfasst deine Mahlzeiten",
      icon: <BookOpen className="w-5 h-5" />,
      color: "bg-primary-pale text-primary",
    },
    {
      label: "Chat",
      desc: "Die KI kennt dein Verhalten",
      icon: <MessageCircle className="w-5 h-5" />,
      color: "bg-accent-warmPale text-accent-warm",
    },
    {
      label: "Plan",
      desc: "Dein Wochenplan wird präziser",
      icon: <CalendarDays className="w-5 h-5" />,
      color: "bg-sage-pale text-primary",
    },
    {
      label: "Review",
      desc: "Reflexion fließt zurück",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "bg-primary-faint text-primary",
    },
  ];

  return (
    <section className="relative py-28 overflow-hidden">
      <div
        aria-hidden
        className="dark-blob-dim absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(226,240,219,0.8) 0%, rgba(226,240,219,0) 65%)",
        }}
      />

      <div ref={ref} className="reveal relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-primary tracking-[0.2em] uppercase mb-3">
            Closed-Loop-System
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-warm-dark mb-5 tracking-tight leading-[1.08]">
            Je mehr du teilst,
            <br />
            <span className="italic text-primary">desto besser werde ich.</span>
          </h2>
          <p className="text-warm-muted max-w-2xl mx-auto leading-relaxed text-lg font-light">
            Dein Tagebuch, dein Gewichtsverlauf und deine Ziele fließen in jede
            Antwort ein — keine generischen Tipps.
          </p>
        </div>

        {/* Horizontal flow */}
        <div className="grid md:grid-cols-4 gap-4 md:gap-3 mb-10 relative">
          {steps.map((s, i) => (
            <div key={s.label} className="relative group">
              <div className="bg-white border border-border rounded-2xl p-5 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 h-full">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${s.color}`}
                >
                  {s.icon}
                </div>
                <p className="text-[10px] text-warm-light uppercase tracking-wider mb-1 font-semibold">
                  0{i + 1}
                </p>
                <p className="font-serif text-lg font-semibold text-warm-dark mb-1">
                  {s.label}
                </p>
                <p className="text-xs text-warm-muted leading-relaxed">
                  {s.desc}
                </p>
              </div>

              {/* Arrow to next step (desktop horizontal) */}
              {i < steps.length - 1 && (
                <div
                  aria-hidden
                  className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-border items-center justify-center shadow-sm"
                >
                  <ArrowRight className="w-3 h-3 text-primary" />
                </div>
              )}
              {/* Arrow to next step (mobile vertical) */}
              {i < steps.length - 1 && (
                <div
                  aria-hidden
                  className="md:hidden flex justify-center mt-3 -mb-1"
                >
                  <div className="w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center shadow-sm">
                    <ArrowRight className="w-3 h-3 text-primary rotate-90" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Loop-back indicator */}
        <div className="anim-scale-up delay-4 flex justify-center">
          <div className="inline-flex items-center gap-2 bg-primary text-white rounded-full px-5 py-2.5 shadow-lg shadow-primary/25">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              Wird jede Woche besser — im Kreislauf
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   6. EXAMPLE QUESTIONS
   ═══════════════════════════════════════════════════════════════ */
function ExampleQuestionsSection() {
  const ref = useScrollReveal();
  const questions: {
    category: string;
    catColor: string;
    icon: React.ReactNode;
    q: string;
    preview: string;
  }[] = [
    {
      category: "Schlaf",
      catColor: "bg-[#EEF4FA] text-[#2C5282]",
      icon: <MessageCircle className="w-3.5 h-3.5" />,
      q: "Was kann ich abends essen um besser zu schlafen?",
      preview: "Leichte, tryptophanreiche Kost — z.B. Banane mit Joghurt…",
    },
    {
      category: "Vegetarisch",
      catColor: "bg-primary-pale text-primary",
      icon: <Salad className="w-3.5 h-3.5" />,
      q: "Wie bekomme ich genug Protein als Vegetarierin?",
      preview: "Linsen, Tofu, Quark, Eier — kombiniert decken sie alle…",
    },
    {
      category: "Mangel",
      catColor: "bg-red-50 text-red-700",
      icon: <Apple className="w-3.5 h-3.5" />,
      q: "Welche Lebensmittel helfen bei Eisenmangel?",
      preview: "Hülsenfrüchte + Vitamin C = optimale Aufnahme…",
    },
    {
      category: "Planung",
      catColor: "bg-accent-warmPale text-accent-warm",
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      q: "Erstelle mir einen Wochenplan ohne Gluten",
      preview: "7 Tage, 3 Mahlzeiten, alle glutenfrei und abgestimmt…",
    },
    {
      category: "Alltag",
      catColor: "bg-sage-pale text-primary",
      icon: <Wheat className="w-3.5 h-3.5" />,
      q: "Was sind gesunde Snacks für unterwegs?",
      preview: "Nüsse, Äpfel, Vollkornriegel ohne Zuckerzusatz…",
    },
    {
      category: "Schwangerschaft",
      catColor: "bg-[#F5EDE4] text-accent-warm",
      icon: <Baby className="w-3.5 h-3.5" />,
      q: "Wie ernähre ich mich in der Schwangerschaft optimal?",
      preview: "Folsäure, Eisen, Omega-3 — und was du meiden solltest…",
    },
  ];

  return (
    <section className="relative bg-surface-muted/40 border-y border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-28">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-primary tracking-[0.2em] uppercase mb-3">
            Beispielfragen
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-warm-dark mb-4 tracking-tight leading-tight">
            Das kannst du fragen
          </h2>
          <p className="text-warm-muted max-w-md mx-auto font-light text-lg">
            Von Alltagsfragen bis zum Wochenplan — probier es einfach aus.
          </p>
        </div>

        <div
          ref={ref}
          className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {questions.map((item) => (
            <Link
              key={item.q}
              href="/sign-up"
              className="group relative bg-white rounded-2xl border border-border p-5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
            >
              <div
                className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-1 mb-3 ${item.catColor}`}
              >
                {item.icon}
                {item.category}
              </div>
              <p className="text-sm font-medium text-warm-dark leading-snug mb-2">
                „{item.q}“
              </p>
              <p className="text-xs text-warm-light leading-relaxed line-clamp-2 opacity-80 group-hover:opacity-100 transition">
                {item.preview}
              </p>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition">
                Frage stellen
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   7. PRICING
   ═══════════════════════════════════════════════════════════════ */
function PricingSection() {
  const ref = useScrollReveal();

  return (
    <section id="preise" className="relative py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-primary tracking-[0.2em] uppercase mb-3">
            Preise
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-warm-dark mb-4 tracking-tight leading-tight">
            Wähle deinen Plan
          </h2>
          <p className="text-warm-muted max-w-md mx-auto text-lg font-light">
            Starte kostenlos. Upgrade wenn du mehr willst.
          </p>
        </div>

        <div
          ref={ref}
          className="reveal grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-center"
        >
          {/* Free — on mobile shown second, on desktop first (left) */}
          <div className="anim-fade-left order-2 md:order-1">
          <PricingCard
            name="Kostenlos"
            tagline="Zum Ausprobieren"
            price="0"
            suffix=""
            features={[
              { text: "15 KI-Beratungen / Monat" },
              { text: "Persönliches Ernährungsprofil" },
              { text: "Ernährungstagebuch & Gewichtstracker" },
            ]}
            ctaLabel="Kostenlos starten"
            ctaVariant="outline"
          />
          </div>

          {/* Basis — prominent, shown first on mobile, center on desktop */}
          <div className="anim-scale-up delay-1 order-1 md:order-2">
          <PricingCard
            name="Basis"
            tagline="Für bewusste Ernährung"
            price="15,99"
            suffix="/ Monat"
            badge={{ label: "Beliebt", color: "bg-primary text-white" }}
            featured
            features={[
              { text: "100 Credits · Haiku KI-Modell", highlight: true },
              { text: "Persönliche Ernährungspläne", highlight: true },
              { text: "Ernährungstagebuch", highlight: true },
              { text: "Gewichts- & Ziel-Tracker" },
              { text: "Wöchentlicher KI-Review" },
              { text: "Rezeptvorschläge" },
            ]}
            ctaLabel="Basis wählen"
            ctaVariant="primary"
          />
          </div>

          {/* Premium — amber accent */}
          <div className="anim-fade-right delay-2 order-3">
          <PricingCard
            name="Premium"
            tagline="Mit persönlicher Betreuung"
            price="49,99"
            suffix="/ Monat"
            badge={{
              label: (
                <span className="inline-flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Premium
                </span>
              ),
              color: "bg-gradient-to-r from-accent-warm to-amber-600 text-white",
            }}
            accent="amber"
            features={[
              { text: "Alles aus Basis" },
              { text: "Prioritäts-Support" },
              {
                text: "400 Credits · Sonnet KI-Modell (Premium-Qualität)",
                highlight: true,
                accent: "amber",
              },
              {
                text: "Foto-Tracking: Essen einfach fotografieren",
                highlight: true,
                accent: "amber",
              },
              {
                text: "Restaurant-Guide: Speisekarte fotografieren & beraten lassen",
                highlight: true,
                accent: "amber",
              },
              {
                text: "Monatlicher Fortschrittsreport",
                highlight: true,
                accent: "amber",
              },
              {
                text: "Wöchentliche Reviews von Janine",
                highlight: true,
                accent: "amber",
              },
              {
                text: "Direktnachrichten an Janine",
                highlight: true,
                accent: "amber",
              },
            ]}
            ctaLabel="Premium wählen"
            ctaVariant="amber"
          />
          </div>
        </div>

        <p className="text-center text-xs text-warm-light mt-10">
          ✓ Alle Pläne starten mit 15 kostenlosen Credits · Jederzeit kündbar
        </p>
      </div>
    </section>
  );
}

interface PricingFeatureItem {
  text: string;
  highlight?: boolean;
  accent?: "amber";
}

function PricingCard({
  name,
  tagline,
  price,
  suffix,
  badge,
  featured,
  accent,
  features,
  ctaLabel,
  ctaVariant,
}: {
  name: string;
  tagline: string;
  price: string;
  suffix: string;
  badge?: { label: React.ReactNode; color: string };
  featured?: boolean;
  accent?: "amber";
  features: PricingFeatureItem[];
  ctaLabel: string;
  ctaVariant: "outline" | "primary" | "amber";
}) {
  const isAmber = accent === "amber";
  return (
    <div
      className={`relative rounded-3xl p-8 flex flex-col transition-all duration-300 ${
        featured
          ? "bg-white border-2 border-primary shadow-2xl shadow-primary/15 md:scale-[1.04] bg-gradient-to-b from-white to-primary-faint/30"
          : isAmber
            ? "bg-white border border-accent-warmLight/40 shadow-lg shadow-amber-600/5"
            : "bg-white border border-border"
      }`}
    >
      {badge && (
        <div
          className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-semibold px-4 py-1.5 rounded-full shadow-md whitespace-nowrap ${badge.color}`}
        >
          {badge.label}
        </div>
      )}

      <div className="mb-6">
        <h3
          className={`font-serif text-2xl font-semibold mb-1 ${isAmber ? "text-accent-warm" : "text-warm-dark"}`}
        >
          {name}
        </h3>
        <p className="text-sm text-warm-muted">{tagline}</p>
      </div>

      <div className="mb-8">
        <span className="text-5xl font-serif font-semibold text-warm-dark tracking-tight">
          {price}
        </span>
        <span className="text-2xl text-warm-muted ml-1">€</span>
        {suffix && (
          <span className="text-warm-muted text-sm ml-1">{suffix}</span>
        )}
      </div>

      <ul className="space-y-3.5 mb-10 flex-1">
        {features.map((f) => (
          <PricingFeature
            key={f.text}
            text={f.text}
            highlight={f.highlight}
            accent={f.accent}
          />
        ))}
      </ul>

      <Link
        href="/sign-up"
        className={`block text-center px-5 py-3.5 rounded-full text-sm font-semibold transition-all duration-200 ${
          ctaVariant === "primary"
            ? "bg-primary text-white hover:bg-primary-hover hover:scale-[1.02] shadow-lg shadow-primary/25"
            : ctaVariant === "amber"
              ? "bg-gradient-to-r from-accent-warm to-amber-600 text-white hover:scale-[1.02] shadow-lg shadow-amber-600/20"
              : "border-2 border-border text-warm-text hover:border-primary hover:text-primary"
        }`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

function PricingFeature({
  text,
  highlight,
  accent,
}: {
  text: string;
  highlight?: boolean;
  accent?: "amber";
}) {
  const isAmber = accent === "amber";
  return (
    <li className="flex items-start gap-3">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isAmber
            ? "bg-accent-warmPale"
            : highlight
              ? "bg-primary-pale"
              : "bg-surface-muted"
        }`}
      >
        <Check
          className={`w-3.5 h-3.5 ${
            isAmber
              ? "text-accent-warm"
              : highlight
                ? "text-primary"
                : "text-warm-light"
          }`}
        />
      </div>
      <span
        className={`text-sm leading-relaxed ${
          highlight ? "text-warm-dark font-medium" : "text-warm-muted"
        }`}
      >
        {text}
      </span>
    </li>
  );
}

/* ═══════════════════════════════════════════════════════════════
   8. JANINE — Merged section
   ═══════════════════════════════════════════════════════════════ */
function JanineSection() {
  const ref = useScrollReveal();
  const points = [
    {
      icon: <MessageCircle className="w-4 h-4" />,
      title: "Persönliche Nachrichten",
      desc: "Schreibe Janine direkt in der App.",
    },
    {
      icon: <Clock className="w-4 h-4" />,
      title: "Antwort binnen 24h",
      desc: "Kein Bot, keine Warteschleife.",
    },
    {
      icon: <Heart className="w-4 h-4" />,
      title: "Empathisch & fachlich",
      desc: "Rat, der wirklich zu dir passt.",
    },
  ];

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-primary-faint via-sage-faint to-accent-warmPale/40 dark:bg-none dark:bg-[#142820]"
      />
      <div
        aria-hidden
        className="dark-blob-dim absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.7), rgba(255,255,255,0) 70%)",
        }}
      />

      <div
        ref={ref}
        className="reveal relative max-w-6xl mx-auto px-4 sm:px-6 py-28"
      >
        <div className="grid md:grid-cols-[auto_1fr] gap-12 lg:gap-16 items-start">
          {/* Photo */}
          <div className="anim-fade-left flex justify-center md:justify-start">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent-warm/20 rounded-full blur-2xl"
              />
              {/* TODO: Durch echtes Foto von Janine ersetzen */}
              <div className="relative w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] rounded-full bg-gradient-to-br from-sage-pale to-accent-warmPale flex items-center justify-center border-4 border-white dark:border-[#44403C] shadow-2xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/janine-avatar.svg"
                  alt="Illustration von Janine"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white rounded-full px-5 py-2 shadow-lg border border-border whitespace-nowrap">
                <p className="text-[11px] font-semibold text-warm-dark">Janine</p>
                <p className="text-[9px] text-warm-muted -mt-0.5">
                  Ernährungswissenschaftlerin
                </p>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="anim-fade-right delay-2">
            <p className="text-xs font-semibold text-primary tracking-[0.2em] uppercase mb-3">
              Die Expertin hinter Nutriva
            </p>
            <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-warm-dark mb-5 tracking-tight leading-[1.05]">
              Janine.
            </h2>
            <p className="text-warm-muted leading-relaxed mb-4 max-w-xl font-light text-lg">
              Studierte Ernährungswissenschaftlerin mit Leidenschaft für
              individuelle Beratung. Die gesamte Wissensbasis dieser App
              basiert auf meinem Fachwissen — wissenschaftlich fundiert und
              persönlich kuratiert.
            </p>
            <p className="text-warm-muted leading-relaxed mb-10 max-w-xl font-light">
              Ich glaube daran, dass gute Ernährung einfach sein kann, wenn
              man die richtige Unterstützung hat.
            </p>

            {/* Premium card-in-card */}
            <div className="bg-white rounded-3xl border border-border shadow-xl shadow-primary/5 p-6 sm:p-7 max-w-xl">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-warm to-amber-600 flex items-center justify-center shadow-md">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-accent-warm tracking-wider uppercase">
                    Premium
                  </p>
                  <p className="font-serif text-lg font-semibold text-warm-dark leading-tight">
                    Schreib Janine direkt
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                {points.map((point) => (
                  <div
                    key={point.title}
                    className="bg-surface-bg rounded-xl p-3 border border-border"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent-warmPale text-accent-warm flex items-center justify-center mb-2">
                      {point.icon}
                    </div>
                    <p className="text-xs font-semibold text-warm-dark mb-0.5">
                      {point.title}
                    </p>
                    <p className="text-[11px] text-warm-muted leading-snug">
                      {point.desc}
                    </p>
                  </div>
                ))}
              </div>
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-accent-warm to-amber-600 text-white px-6 py-3 rounded-full text-sm font-semibold hover:scale-[1.02] transition-all shadow-lg shadow-amber-600/25"
              >
                Premium entdecken
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   9. FAQ — 2 columns
   ═══════════════════════════════════════════════════════════════ */
function FaqSection() {
  const ref = useScrollReveal();
  const faqs = [
    {
      question: "Was unterscheidet diese App von ChatGPT?",
      answer:
        "Die Wissensbasis wurde von einer studierten Ernährungswissenschaftlerin kuratiert. Dazu fließen dein Profil, Tagebuch und Gewichtsverlauf in jede Antwort ein — das kann kein generischer Chatbot.",
    },
    {
      question: "Werden meine Daten an die KI weitergegeben?",
      answer:
        "Dein Name wird nie an die KI gesendet. Nur anonymisierte Profildaten (Ziele, Allergien) fließen ein, damit die Antworten zu dir passen. Vollständig DSGVO-konform.",
    },
    {
      question: "Kann ich die App auch vegan oder vegetarisch nutzen?",
      answer:
        "Ja. Im Profil gibst du deine Ernährungsform an und alle Empfehlungen werden darauf abgestimmt.",
    },
    {
      question: "Ersetzt die App eine echte Ernährungsberatung?",
      answer:
        "Die App bietet fundiertes Fachwissen, ersetzt aber keine ärztliche Beratung. Bei ernsthaften Beschwerden empfehlen wir immer den Gang zum Arzt.",
    },
    {
      question: "Was ist der Wochencheck?",
      answer:
        "Jeden Sonntag analysiert die KI dein Tagebuch der letzten Woche und gibt dir einen persönlichen Rückblick: Was lief gut, was kannst du verbessern, und einen Fokus für die nächste Woche.",
    },
    {
      question: "Kann ich Janine direkt schreiben?",
      answer:
        "Ja, im Premium-Plan kannst du Janine direkt in der App eine Nachricht schreiben und bekommst eine persönliche Antwort.",
    },
  ];

  return (
    <section id="faq" className="max-w-5xl mx-auto px-4 sm:px-6 py-28">
      <div className="text-center mb-14">
        <p className="text-xs font-semibold text-primary tracking-[0.2em] uppercase mb-3">
          FAQ
        </p>
        <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-warm-dark tracking-tight leading-tight">
          Häufige Fragen
        </h2>
      </div>

      <div
        ref={ref}
        className="reveal grid md:grid-cols-2 gap-4"
      >
        {faqs.map((faq) => (
          <FaqItem
            key={faq.question}
            question={faq.question}
            answer={faq.answer}
          />
        ))}
      </div>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-300 ${
        open
          ? "border-primary/40 shadow-lg shadow-primary/5"
          : "border-border hover:border-primary/20"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-start justify-between gap-4 w-full px-5 py-5 text-left group"
        aria-expanded={open}
      >
        <span className="text-[15px] font-semibold text-warm-dark group-hover:text-primary transition-colors leading-snug">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-warm-light flex-shrink-0 mt-1 transition-transform duration-300 ${
            open ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{
          maxHeight: open
            ? `${contentRef.current?.scrollHeight ?? 500}px`
            : "0",
          opacity: open ? 1 : 0,
        }}
      >
        <p className="text-sm text-warm-muted leading-relaxed px-5 pb-5">
          {answer}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   10. CTA FOOTER — full-bleed primary
   ═══════════════════════════════════════════════════════════════ */
function CtaFooterSection() {
  const ref = useScrollReveal();
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-primary via-primary-hover to-[#0f3a26]"
      />
      {/* Decorative shapes */}
      <div
        aria-hidden
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none -translate-y-1/3 translate-x-1/4"
        style={{
          background:
            "radial-gradient(closest-side, rgba(168,201,155,0.3), rgba(168,201,155,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none translate-y-1/3 -translate-x-1/4"
        style={{
          background:
            "radial-gradient(closest-side, rgba(212,165,116,0.2), rgba(212,165,116,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div
        ref={ref}
        className="reveal relative max-w-4xl mx-auto px-4 sm:px-6 py-28 sm:py-32 text-center"
      >
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="text-xs font-medium text-white tracking-wide">
            Starte in 2 Minuten
          </span>
        </div>
        <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-6 tracking-tight leading-[1.05]">
          Bereit, dich besser
          <br />
          <span className="italic">zu ernähren?</span>
        </h2>
        <p className="text-white/80 mb-10 max-w-lg mx-auto leading-relaxed text-lg font-light">
          Starte in 2 Minuten. Kostenlos. Kein Abo nötig.
        </p>
        <Link
          href="/sign-up"
          className="group inline-flex items-center gap-2.5 bg-white text-primary px-9 py-4 rounded-full font-semibold text-base hover:scale-[1.04] active:scale-95 transition-all duration-200 shadow-2xl"
        >
          Jetzt loslegen
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <p className="text-xs text-white/60 mt-6">
          15 Credits gratis · Keine Kreditkarte · Jederzeit kündbar
        </p>
      </div>
    </section>
  );
}
