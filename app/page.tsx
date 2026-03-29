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
  User,
  BookOpen,
  TrendingUp,
  Send,
  RefreshCw,
  Sparkles,
  Shield,
  GraduationCap,
  BookMarked,
  Heart,
  Leaf,
} from "lucide-react";

/* ═══════════════════════════════════════
   SCROLL REVEAL HOOK
   ═══════════════════════════════════════ */
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
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <TrustBar />
        <FeaturesSection />
        <ClosedLoopSection />
        <HowItWorksSection />
        <ExampleQuestionsSection />
        <PricingSection />
        <AboutJanineSection />
        <FaqSection />
        <CtaFooterSection />
      </main>
      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════
   1. HERO
   ═══════════════════════════════════════ */
function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle organic background shapes */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-bg/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-warmPale/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-32 lg:pb-36">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div className="max-w-xl">
            <p className="text-sm font-medium text-primary tracking-wide uppercase mb-5">
              Fundierte Ern&auml;hrungsberatung
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.6rem] font-semibold text-warm-dark leading-[1.12] mb-6">
              Deine Ern&auml;hrungs&shy;beraterin.
              <br />
              <span className="text-primary">Immer dabei.</span>
            </h1>
            <p className="text-lg text-warm-muted leading-relaxed mb-10 max-w-md">
              Fundiertes Fachwissen einer studierten Ern&auml;hrungswissenschaftlerin
              &mdash; pers&ouml;nlich auf dich abgestimmt. Frag was du willst, bekomme
              Antworten die zu dir passen.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2.5 bg-primary text-white px-8 py-4 rounded-full font-medium hover:bg-primary-light transition-all duration-200 shadow-lg shadow-primary/20 cursor-pointer"
              >
                Kostenlos starten
                <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="text-sm text-warm-light">
                Kein Abo n&ouml;tig &middot; 15 Credits gratis
              </span>
            </div>
          </div>

          {/* Right: Chat Mockup */}
          <div className="relative lg:pl-4">
            {/* Decorative ring behind mockup */}
            <div className="absolute -top-6 -right-6 w-72 h-72 border border-primary-bg rounded-full pointer-events-none hidden lg:block" />

            <div className="bg-white rounded-3xl shadow-2xl shadow-black/[0.06] border border-warm-border/60 overflow-hidden">
              {/* Header */}
              <div className="bg-primary px-6 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Leaf className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Ern&auml;hrungsberatung</p>
                  <p className="text-white/60 text-xs">Online</p>
                </div>
              </div>

              {/* Messages */}
              <div className="p-5 sm:p-6 space-y-4 bg-surface-bg min-h-[260px]">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="bg-primary text-white px-4 py-3 rounded-2xl rounded-br-md max-w-[80%]">
                    <p className="text-sm leading-relaxed">
                      Was kann ich als Snack essen wenn ich Laktoseintoleranz habe?
                    </p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary-bg flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="bg-white border border-warm-border/80 px-4 py-3.5 rounded-2xl rounded-bl-md max-w-[85%] shadow-sm">
                    <p className="text-sm text-warm-text leading-relaxed mb-2.5">
                      Hier sind <strong>5 leckere Snack-Ideen</strong> f&uuml;r dich:
                    </p>
                    <ul className="text-sm text-warm-muted space-y-1">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">1.</span>
                        N&uuml;sse &amp; Trockenf&uuml;chte-Mix
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">2.</span>
                        Reiswaffeln mit Avocado
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">3.</span>
                        Dunkle Schokolade (ab 70%)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">4.</span>
                        Hummus mit Gem&uuml;sesticks
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">5.</span>
                        Laktosefreier Joghurt mit Beeren
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="px-5 py-3.5 border-t border-warm-border/60 bg-white flex items-center gap-3">
                <div className="flex-1 bg-surface-muted rounded-xl px-4 py-2.5">
                  <p className="text-xs text-warm-light">Stelle eine Frage...</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center cursor-pointer hover:bg-primary-light transition">
                  <Send className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   2. TRUST BAR
   ═══════════════════════════════════════ */
function TrustBar() {
  const ref = useScrollReveal();
  const items = [
    { icon: <GraduationCap className="w-4 h-4" />, text: "Studierte Ern\u00e4hrungswissenschaftlerin" },
    { icon: <BookMarked className="w-4 h-4" />, text: "\u00dcber 500 wissenschaftliche Quellen" },
    { icon: <Shield className="w-4 h-4" />, text: "DSGVO-konform" },
  ];

  return (
    <div ref={ref} className="reveal border-y border-warm-border bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
          {items.map((item) => (
            <div key={item.text} className="flex items-center gap-2.5">
              <span className="text-primary">{item.icon}</span>
              <span className="text-sm text-warm-muted font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   3. FEATURES (3 Cards)
   ═══════════════════════════════════════ */
function FeaturesSection() {
  const ref = useScrollReveal();
  const features = [
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "Chat mit KI-Beraterin",
      description:
        "Stelle jede Frage rund um Ern\u00e4hrung. Sofort fundierte Antworten \u2014 basierend auf deinem Profil, Tagebuch und Zielen.",
      color: "bg-primary-bg",
      iconColor: "text-primary",
    },
    {
      icon: <CalendarDays className="w-5 h-5" />,
      title: "Dein Ern\u00e4hrungsplan",
      description:
        "KI-generierte Wochenpl\u00e4ne abgestimmt auf deine Ziele, Allergien, Vorlieben und dein echtes Essverhalten.",
      color: "bg-accent-warmPale",
      iconColor: "text-accent-warm",
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Wochenreview",
      description:
        "Jeden Sonntag: Was lief gut, was kannst du verbessern, Fokus f\u00fcr die n\u00e4chste Woche. Warmherzig und fachlich.",
      color: "bg-primary-bg",
      iconColor: "text-primary",
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-28">
      <div className="text-center mb-16">
        <p className="text-sm font-medium text-primary tracking-wide uppercase mb-3">
          Funktionen
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark mb-4">
          Alles f&uuml;r bessere Ern&auml;hrung
        </h2>
        <p className="text-warm-muted max-w-lg mx-auto leading-relaxed">
          Fundiertes Wissen, individuell auf dich abgestimmt &mdash;
          wie eine pers&ouml;nliche Beratung, die immer f&uuml;r dich da ist.
        </p>
      </div>

      <div ref={ref} className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <div
            key={f.title}
            className="group bg-white rounded-2xl border border-warm-border/60 p-8 hover:shadow-lg hover:shadow-black/[0.04] hover:-translate-y-1 transition-all duration-300 cursor-default"
          >
            <div
              className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center ${f.iconColor} mb-5`}
            >
              {f.icon}
            </div>
            <h3 className="font-serif text-xl font-semibold text-warm-dark mb-3">
              {f.title}
            </h3>
            <p className="text-sm text-warm-muted leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   4. CLOSED LOOP
   ═══════════════════════════════════════ */
function ClosedLoopSection() {
  const ref = useScrollReveal();
  const steps = [
    { label: "Tagebuch", icon: <BookOpen className="w-4 h-4" />, position: "top" },
    { label: "Chat", icon: <MessageCircle className="w-4 h-4" />, position: "right" },
    { label: "Plan", icon: <CalendarDays className="w-4 h-4" />, position: "bottom" },
    { label: "Wochencheck", icon: <TrendingUp className="w-4 h-4" />, position: "left" },
  ];

  return (
    <section className="bg-white border-y border-warm-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-28">
        <div ref={ref} className="reveal">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-primary tracking-wide uppercase mb-3">
              Closed-Loop-System
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark mb-5">
              Je mehr du teilst,<br className="hidden sm:block" /> desto besser werde ich.
            </h2>
            <p className="text-warm-muted max-w-2xl mx-auto leading-relaxed">
              Dein Tagebuch, dein Gewichtsverlauf und deine Ziele flie&szlig;en in jede Antwort ein.
              Keine generischen Tipps &mdash; sondern Empfehlungen die auf deinem echten Verhalten basieren.
            </p>
          </div>

          {/* Loop diagram */}
          <div className="flex justify-center">
            <div className="relative w-80 h-80 sm:w-96 sm:h-96">
              {/* Center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary-bg/60 flex items-center justify-center border-2 border-primary/10">
                  <RefreshCw className="w-8 h-8 text-primary/70" />
                </div>
              </div>

              {/* Dashed circle */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 384 384">
                <circle
                  cx="192"
                  cy="192"
                  r="150"
                  fill="none"
                  stroke="#E8E5E0"
                  strokeWidth="1.5"
                  strokeDasharray="6 8"
                />
                {/* Directional arrows on the circle path */}
                <path d="M192 42 l4 8 l-8 0 z" fill="#D4A574" opacity="0.6" />
                <path d="M342 192 l-8 4 l0 -8 z" fill="#D4A574" opacity="0.6" />
                <path d="M192 342 l-4 -8 l8 0 z" fill="#D4A574" opacity="0.6" />
                <path d="M42 192 l8 -4 l0 8 z" fill="#D4A574" opacity="0.6" />
              </svg>

              {/* Labels */}
              {steps.map((step) => {
                const positions: Record<string, string> = {
                  top: "top-0 left-1/2 -translate-x-1/2 -translate-y-2",
                  right: "right-0 top-1/2 -translate-y-1/2 translate-x-2",
                  bottom: "bottom-0 left-1/2 -translate-x-1/2 translate-y-2",
                  left: "left-0 top-1/2 -translate-y-1/2 -translate-x-2",
                };
                return (
                  <div
                    key={step.label}
                    className={`absolute ${positions[step.position]} bg-white border border-warm-border rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-2`}
                  >
                    <span className="text-primary">{step.icon}</span>
                    <p className="text-sm font-medium text-warm-dark">{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   5. HOW IT WORKS (4 Steps)
   ═══════════════════════════════════════ */
function HowItWorksSection() {
  const ref = useScrollReveal();
  const steps = [
    {
      num: "01",
      title: "Profil anlegen",
      desc: "Ziele, Allergien, Ern\u00e4hrungsform \u2014 dauert 2 Minuten.",
      icon: <User className="w-5 h-5" />,
    },
    {
      num: "02",
      title: "Frage stellen",
      desc: "Chatte mit deiner KI-Beraterin oder lass dir einen Plan erstellen.",
      icon: <MessageCircle className="w-5 h-5" />,
    },
    {
      num: "03",
      title: "Tagebuch f\u00fchren",
      desc: "Erfasse was du isst. Die KI lernt dich besser kennen.",
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      num: "04",
      title: "Besser essen",
      desc: "Jede Woche bessere Empfehlungen dank Closed-Loop-System.",
      icon: <Heart className="w-5 h-5" />,
    },
  ];

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-28">
      <div className="text-center mb-16">
        <p className="text-sm font-medium text-primary tracking-wide uppercase mb-3">
          So funktioniert&apos;s
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark mb-4">
          In vier Schritten zu besserer Ern&auml;hrung
        </h2>
      </div>

      <div ref={ref} className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
        {steps.map((s, i) => (
          <div key={s.num} className="relative text-center group">
            {/* Connector line (desktop only) */}
            {i < steps.length - 1 && (
              <div className="hidden lg:block absolute top-7 left-[calc(50%+32px)] right-[calc(-50%+32px)] h-[1px] bg-warm-border" />
            )}

            {/* Number circle */}
            <div className="w-14 h-14 rounded-2xl bg-primary-bg flex items-center justify-center mx-auto mb-5 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
              {s.icon}
            </div>
            <span className="text-xs font-medium text-primary/50 tracking-widest uppercase mb-2 block">
              Schritt {s.num}
            </span>
            <h3 className="font-serif text-lg font-semibold text-warm-dark mb-2">{s.title}</h3>
            <p className="text-sm text-warm-muted leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   6. EXAMPLE QUESTIONS
   ═══════════════════════════════════════ */
function ExampleQuestionsSection() {
  const ref = useScrollReveal();
  const questions = [
    "Was kann ich abends essen um besser zu schlafen?",
    "Wie bekomme ich genug Protein als Vegetarierin?",
    "Welche Lebensmittel helfen bei Eisenmangel?",
    "Erstelle mir einen Wochenplan ohne Gluten",
    "Was sind gesunde Snacks f\u00fcr unterwegs?",
    "Wie ern\u00e4hre ich mich in der Schwangerschaft optimal?",
  ];

  return (
    <section className="bg-white border-y border-warm-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-28">
        <div className="text-center mb-14">
          <p className="text-sm font-medium text-primary tracking-wide uppercase mb-3">
            Beispielfragen
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark mb-4">
            Das fragen unsere Nutzerinnen
          </h2>
          <p className="text-warm-muted max-w-md mx-auto">
            Tippe auf eine Frage und starte sofort deine erste Beratung.
          </p>
        </div>

        <div ref={ref} className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {questions.map((q) => (
            <Link
              key={q}
              href="/sign-up"
              className="group flex items-start gap-3 bg-surface-bg border border-warm-border/60 rounded-2xl px-5 py-4.5 text-sm text-warm-text hover:border-primary/40 hover:bg-primary-bg/30 hover:shadow-sm transition-all duration-200 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-primary/40 flex-shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
              <span className="leading-relaxed">{q}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   7. PRICING (3 Tiers)
   ═══════════════════════════════════════ */
function PricingSection() {
  const ref = useScrollReveal();
  const [yearly, setYearly] = useState(false);

  return (
    <section id="preise" className="max-w-6xl mx-auto px-4 sm:px-6 py-28">
      <div className="text-center mb-6">
        <p className="text-sm font-medium text-primary tracking-wide uppercase mb-3">
          Preise
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark mb-4">
          W&auml;hle deinen Plan
        </h2>
        <p className="text-warm-muted max-w-md mx-auto">
          Starte kostenlos. Upgrade wenn du mehr willst.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-3 mb-16">
        <span
          className={`text-sm cursor-pointer transition ${!yearly ? "text-warm-dark font-medium" : "text-warm-muted"}`}
          onClick={() => setYearly(false)}
        >
          Monatlich
        </span>
        <button
          onClick={() => setYearly(!yearly)}
          className={`relative w-12 h-7 rounded-full transition-colors duration-200 cursor-pointer ${yearly ? "bg-primary" : "bg-warm-border"}`}
          aria-label="Zwischen monatlich und j&auml;hrlich wechseln"
        >
          <div
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${yearly ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
        <span
          className={`text-sm cursor-pointer transition ${yearly ? "text-warm-dark font-medium" : "text-warm-muted"}`}
          onClick={() => setYearly(true)}
        >
          J&auml;hrlich{" "}
          <span className="text-primary text-xs font-medium ml-1 bg-primary-bg px-2 py-0.5 rounded-full">
            &minus;20%
          </span>
        </span>
      </div>

      <div ref={ref} className="reveal-stagger grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Free */}
        <div className="bg-white rounded-2xl border border-warm-border/60 p-8 flex flex-col">
          <div className="mb-6">
            <h3 className="font-serif text-xl font-semibold text-warm-dark mb-1">Kostenlos</h3>
            <p className="text-sm text-warm-muted">Zum Ausprobieren</p>
          </div>
          <div className="mb-8">
            <span className="text-4xl font-bold text-warm-dark">0</span>
            <span className="text-lg text-warm-muted ml-1">&euro;</span>
          </div>
          <ul className="space-y-3.5 mb-10 flex-1">
            <PricingFeature text="15 Credits pro Monat" />
            <PricingFeature text="Basisprofil" />
            <PricingFeature text="Allgemeine Empfehlungen" />
          </ul>
          <Link
            href="/sign-up"
            className="block text-center border-2 border-warm-border text-warm-text px-5 py-3 rounded-full text-sm font-medium hover:border-primary hover:text-primary transition cursor-pointer"
          >
            Kostenlos starten
          </Link>
        </div>

        {/* Basis */}
        <div className="bg-white rounded-2xl border-2 border-primary p-8 flex flex-col relative shadow-lg shadow-primary/[0.06]">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-medium px-4 py-1.5 rounded-full">
            Beliebt
          </div>
          <div className="mb-6">
            <h3 className="font-serif text-xl font-semibold text-warm-dark mb-1">Basis</h3>
            <p className="text-sm text-warm-muted">F&uuml;r bewusste Ern&auml;hrung</p>
          </div>
          <div className="mb-8">
            <span className="text-4xl font-bold text-warm-dark">
              {yearly ? "12,79" : "15,99"}
            </span>
            <span className="text-lg text-warm-muted ml-1">&euro;</span>
            <span className="text-warm-muted text-sm ml-1">/ Monat</span>
          </div>
          <ul className="space-y-3.5 mb-10 flex-1">
            <PricingFeature text="100 Credits pro Monat" highlight />
            <PricingFeature text="Pers\u00f6nliche Ern\u00e4hrungspl\u00e4ne" highlight />
            <PricingFeature text="Ern\u00e4hrungstagebuch" highlight />
            <PricingFeature text="Gewichts- & Ziel-Tracker" />
            <PricingFeature text="W\u00f6chentlicher KI-Review" />
            <PricingFeature text="Rezeptvorschl\u00e4ge" />
          </ul>
          <Link
            href="/sign-up"
            className="block text-center bg-primary text-white px-5 py-3 rounded-full text-sm font-medium hover:bg-primary-light transition shadow-md shadow-primary/20 cursor-pointer"
          >
            Basis w&auml;hlen
          </Link>
        </div>

        {/* Premium */}
        <div className="bg-white rounded-2xl border border-warm-border/60 p-8 flex flex-col">
          <div className="mb-6">
            <h3 className="font-serif text-xl font-semibold text-warm-dark mb-1">Premium</h3>
            <p className="text-sm text-warm-muted">Mit pers&ouml;nlicher Betreuung</p>
          </div>
          <div className="mb-8">
            <span className="text-4xl font-bold text-warm-dark">
              {yearly ? "39,99" : "49,99"}
            </span>
            <span className="text-lg text-warm-muted ml-1">&euro;</span>
            <span className="text-warm-muted text-sm ml-1">/ Monat</span>
          </div>
          <ul className="space-y-3.5 mb-10 flex-1">
            <PricingFeature text="400 Credits pro Monat" highlight />
            <PricingFeature text="Alles aus Basis" />
            <PricingFeature text="W\u00f6chentliche Reviews von Janine" highlight />
            <PricingFeature text="Direktnachrichten an Janine" highlight />
            <PricingFeature text="Priorit\u00e4ts-Support" />
          </ul>
          <Link
            href="/sign-up"
            className="block text-center bg-primary text-white px-5 py-3 rounded-full text-sm font-medium hover:bg-primary-light transition cursor-pointer"
          >
            Premium w&auml;hlen
          </Link>
        </div>
      </div>
    </section>
  );
}

function PricingFeature({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          highlight ? "bg-primary-bg" : "bg-surface-muted"
        }`}
      >
        <Check
          className={`w-3 h-3 ${highlight ? "text-primary" : "text-warm-light"}`}
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

/* ═══════════════════════════════════════
   8. ABOUT JANINE
   ═══════════════════════════════════════ */
function AboutJanineSection() {
  const ref = useScrollReveal();
  return (
    <section className="bg-white border-y border-warm-border">
      <div ref={ref} className="reveal max-w-4xl mx-auto px-4 sm:px-6 py-28">
        <div className="grid md:grid-cols-[auto_1fr] gap-12 items-center">
          {/* Photo placeholder */}
          <div className="flex justify-center md:justify-start">
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-3xl bg-gradient-to-br from-primary-bg to-accent-warmPale flex items-center justify-center border-2 border-warm-border/40">
              <span className="text-5xl font-serif font-semibold text-primary/40">J</span>
            </div>
          </div>

          {/* Text */}
          <div className="text-center md:text-left">
            <p className="text-sm font-medium text-primary tracking-wide uppercase mb-3">
              Die Expertin dahinter
            </p>
            <h2 className="font-serif text-3xl font-semibold text-warm-dark mb-5">
              &Uuml;ber Janine
            </h2>
            <p className="text-warm-muted leading-relaxed mb-4 max-w-lg">
              Studierte Ern&auml;hrungswissenschaftlerin mit Leidenschaft f&uuml;r individuelle Beratung.
              Die gesamte Wissensbasis dieser App basiert auf meinem Fachwissen &mdash; &uuml;ber 500
              wissenschaftliche Quellen, pers&ouml;nlich kuratiert.
            </p>
            <p className="text-warm-muted leading-relaxed max-w-lg">
              Ich glaube daran, dass gute Ern&auml;hrung einfach sein kann,
              wenn man die richtige Unterst&uuml;tzung hat. Diese App ist mein Weg,
              fundiertes Wissen f&uuml;r alle zug&auml;nglich zu machen.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   9. FAQ
   ═══════════════════════════════════════ */
function FaqSection() {
  const ref = useScrollReveal();
  const faqs = [
    {
      question: "Was unterscheidet diese App von ChatGPT?",
      answer:
        "Die Wissensbasis wurde von einer studierten Ern\u00e4hrungswissenschaftlerin kuratiert. Dazu flie\u00dfen dein Profil, Tagebuch und Gewichtsverlauf in jede Antwort ein \u2014 das kann kein generischer Chatbot.",
    },
    {
      question: "Werden meine Daten an die KI weitergegeben?",
      answer:
        "Dein Name wird nie an die KI gesendet. Nur anonymisierte Profildaten (Ziele, Allergien) flie\u00dfen ein, damit die Antworten zu dir passen. Vollst\u00e4ndig DSGVO-konform.",
    },
    {
      question: "Kann ich die App auch vegan oder vegetarisch nutzen?",
      answer:
        "Ja. Im Profil gibst du deine Ern\u00e4hrungsform an und alle Empfehlungen werden darauf abgestimmt.",
    },
    {
      question: "Ersetzt die App eine echte Ern\u00e4hrungsberatung?",
      answer:
        "Die App bietet fundiertes Fachwissen, ersetzt aber keine \u00e4rztliche Beratung. Bei ernsthaften Beschwerden empfehlen wir immer den Gang zum Arzt.",
    },
    {
      question: "Was ist der Wochencheck?",
      answer:
        "Jeden Sonntag analysiert die KI dein Tagebuch der letzten Woche und gibt dir einen pers\u00f6nlichen R\u00fcckblick: Was lief gut, was kannst du verbessern, und einen Fokus f\u00fcr die n\u00e4chste Woche.",
    },
    {
      question: "Kann ich Janine direkt schreiben?",
      answer:
        "Ja, im Premium-Plan kannst du Janine direkt in der App eine Nachricht schreiben und bekommst eine pers\u00f6nliche Antwort.",
    },
  ];

  return (
    <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-28">
      <div className="text-center mb-14">
        <p className="text-sm font-medium text-primary tracking-wide uppercase mb-3">
          FAQ
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark">
          H&auml;ufige Fragen
        </h2>
      </div>

      <div ref={ref} className="reveal space-y-1">
        {faqs.map((faq) => (
          <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
        ))}
      </div>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-warm-border/60">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-4 w-full py-5 text-left cursor-pointer group"
      >
        <span className="font-medium text-warm-dark group-hover:text-primary transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-warm-light flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          open ? "max-h-40 opacity-100 pb-5" : "max-h-0 opacity-0"
        }`}
      >
        <p className="text-sm text-warm-muted leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   10. CTA FOOTER
   ═══════════════════════════════════════ */
function CtaFooterSection() {
  const ref = useScrollReveal();
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-28">
      <div
        ref={ref}
        className="reveal relative overflow-hidden bg-primary rounded-3xl px-8 py-16 sm:px-16 sm:py-20 text-center"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative">
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-5">
            Bereit f&uuml;r fundierte<br className="hidden sm:block" /> Ern&auml;hrungsberatung?
          </h2>
          <p className="text-white/60 mb-10 max-w-md mx-auto leading-relaxed">
            Erstelle dein Profil und stelle deine erste Frage &mdash;
            kostenlos und unverbindlich.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2.5 bg-white text-primary px-8 py-4 rounded-full font-medium hover:bg-surface-bg transition shadow-lg shadow-black/10 cursor-pointer"
          >
            Jetzt loslegen
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
