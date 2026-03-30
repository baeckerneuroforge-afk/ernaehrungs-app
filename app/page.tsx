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
  Sparkles,
  Shield,
  GraduationCap,
  FlaskConical,
  Heart,
  Leaf,
  Clock,
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
        <HowItWorksSection />
        <FeaturesSection />
        <ClosedLoopSection />
        <ExampleQuestionsSection />
        <PricingSection />
        <JanineDirectSection />
        <AboutJanineSection />
        <FaqSection />
        <CtaFooterSection />
      </main>
      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════
   1. HERO — Video Demo in Phone Frame
   ═══════════════════════════════════════ */
function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  // Auto-play video when phone frame scrolls into view
  useEffect(() => {
    const el = phoneRef.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [videoFailed]);

  return (
    <section className="relative overflow-hidden">
      {/* Soft organic background shapes */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sage-pale/60 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-warmPale/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

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

          {/* Right: iPhone with Video */}
          <div className="relative lg:pl-4 flex justify-center lg:justify-end">
            {/* Decorative ring */}
            <div className="absolute -top-8 -right-8 w-80 h-80 border border-sage-pale rounded-full pointer-events-none hidden lg:block" />

            {/* Phone frame */}
            <div ref={phoneRef} className="relative w-[280px] sm:w-[300px]">
              <div className="bg-[#1A1A1A] rounded-[44px] p-[6px] shadow-2xl shadow-black/15">
                <div className="bg-[#F0F7EC] rounded-[40px] overflow-hidden relative">
                  {/* Notch overlay */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-[#1A1A1A] rounded-b-2xl z-10" />

                  {/* Video or fallback */}
                  {!videoFailed ? (
                    <video
                      ref={videoRef}
                      src="/ernaehrungsapp-demo.mp4"
                      autoPlay
                      muted
                      loop
                      playsInline
                      onError={() => setVideoFailed(true)}
                      className="w-full aspect-[9/19.5] object-cover"
                    />
                  ) : (
                    <HeroFallback />
                  )}

                  {/* Home indicator overlay */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center py-2 z-10">
                    <div className="w-24 h-1 bg-black/10 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Static fallback if video fails to load */
function HeroFallback() {
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 pt-10 pb-3 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
          <Leaf className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-white font-medium text-xs">Ern&auml;hrungsberatung</p>
          <p className="text-white/60 text-[10px]">Online</p>
        </div>
      </div>
      {/* Messages */}
      <div className="bg-surface-bg px-3 py-4 space-y-3 min-h-[320px] sm:min-h-[360px]">
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
              Hier sind 5 leckere Snack-Ideen f&uuml;r dich:
            </p>
            <ul className="text-xs text-warm-muted space-y-0.5">
              <li>1. N&uuml;sse &amp; Trockenf&uuml;chte-Mix</li>
              <li>2. Reiswaffeln mit Avocado</li>
              <li>3. Dunkle Schokolade (ab 70%)</li>
              <li>4. Hummus mit Gem&uuml;sesticks</li>
              <li>5. Laktosefreier Joghurt mit Beeren</li>
            </ul>
          </div>
        </div>
      </div>
      {/* Input */}
      <div className="px-3 py-2.5 border-t border-warm-border/60 bg-white flex items-center gap-2">
        <div className="flex-1 bg-surface-muted rounded-xl px-3 py-2">
          <p className="text-[10px] text-warm-light">Stelle eine Frage...</p>
        </div>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Send className="w-3 h-3 text-white" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   2. TRUST BAR
   ═══════════════════════════════════════ */
function TrustBar() {
  const ref = useScrollReveal();
  const items = [
    { icon: <GraduationCap className="w-4 h-4" />, text: "Studierte Ernährungswissenschaftlerin" },
    { icon: <FlaskConical className="w-4 h-4" />, text: "Wissenschaftlich fundiert" },
    { icon: <Shield className="w-4 h-4" />, text: "DSGVO-konform" },
  ];

  return (
    <div ref={ref} className="reveal border-y border-sage-light/40 bg-sage-faint/50">
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
   3. HOW IT WORKS (4 Steps) — moved up
   ═══════════════════════════════════════ */
function HowItWorksSection() {
  const ref = useScrollReveal();
  const steps = [
    {
      num: "01",
      title: "Profil anlegen",
      desc: "Ziele, Allergien, Ernährungsform — dauert 2 Minuten.",
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
      title: "Tagebuch führen",
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
              <div className="hidden lg:block absolute top-7 left-[calc(50%+32px)] right-[calc(-50%+32px)] h-[1px] bg-sage-light" />
            )}

            {/* Icon circle */}
            <div className="w-14 h-14 rounded-2xl bg-sage-pale flex items-center justify-center mx-auto mb-5 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
              {s.icon}
            </div>
            <span className="text-xs font-medium text-sage-DEFAULT tracking-widest uppercase mb-2 block">
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
   4. FEATURES (3 Cards)
   ═══════════════════════════════════════ */
function FeaturesSection() {
  const ref = useScrollReveal();
  const features = [
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "Chat mit KI-Beraterin",
      description:
        "Stelle jede Frage rund um Ernährung. Sofort fundierte Antworten — basierend auf deinem Profil, Tagebuch und Zielen.",
    },
    {
      icon: <CalendarDays className="w-5 h-5" />,
      title: "Dein Ernährungsplan",
      description:
        "KI-generierte Wochenpläne abgestimmt auf deine Ziele, Allergien, Vorlieben und dein echtes Essverhalten.",
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Wochenreview",
      description:
        "Jeden Sonntag: Was lief gut, was kannst du verbessern, Fokus für die nächste Woche. Warmherzig und fachlich.",
    },
  ];

  return (
    <section className="bg-sage-faint/30 border-y border-sage-light/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-28">
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
              className="group bg-white rounded-2xl border border-sage-light/50 p-8 hover:shadow-lg hover:shadow-sage-DEFAULT/[0.06] hover:-translate-y-1 transition-all duration-300 cursor-default"
            >
              <div className="w-12 h-12 rounded-2xl bg-sage-pale flex items-center justify-center text-primary mb-5">
                {f.icon}
              </div>
              <h3 className="font-serif text-xl font-semibold text-warm-dark mb-3">
                {f.title}
              </h3>
              <p className="text-sm text-warm-muted leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   5. CLOSED LOOP — Cards with animated arrows
   ═══════════════════════════════════════ */
function ClosedLoopSection() {
  const ref = useScrollReveal();
  const steps = [
    { label: "Tagebuch", desc: "Erfasse deine Mahlzeiten", icon: <BookOpen className="w-5 h-5" /> },
    { label: "Chat", desc: "Stelle individuelle Fragen", icon: <MessageCircle className="w-5 h-5" /> },
    { label: "Plan", desc: "Erhalte deinen Wochenplan", icon: <CalendarDays className="w-5 h-5" /> },
    { label: "Wochencheck", desc: "Reflektiere deine Woche", icon: <TrendingUp className="w-5 h-5" /> },
  ];

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-28">
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

        {/* Loop diagram — cards with animated SVG arrows */}
        <div className="flex justify-center">
          <div className="relative w-[320px] h-[320px] sm:w-[400px] sm:h-[400px]">
            {/* Animated rotating circle behind everything */}
            <svg
              className="absolute inset-0 w-full h-full animate-rotate-slow motion-reduce:animate-none"
              viewBox="0 0 400 400"
            >
              <defs>
                <linearGradient id="arrow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#A8C99B" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#A8C99B" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#A8C99B" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <circle
                cx="200" cy="200" r="155"
                fill="none"
                stroke="url(#arrow-grad)"
                strokeWidth="2"
                strokeDasharray="16 10"
                strokeLinecap="round"
              />
            </svg>

            {/* Static arrows between cards */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
              {/* Top → Right */}
              <path d="M250 75 Q 310 95 325 155" fill="none" stroke="#C5DFB8" strokeWidth="2" />
              <polygon points="327,155 320,145 332,148" fill="#A8C99B" />
              {/* Right → Bottom */}
              <path d="M325 245 Q 310 305 250 325" fill="none" stroke="#C5DFB8" strokeWidth="2" />
              <polygon points="250,327 258,320 255,332" fill="#A8C99B" />
              {/* Bottom → Left */}
              <path d="M150 325 Q 60 305 45 245" fill="none" stroke="#C5DFB8" strokeWidth="2" />
              <polygon points="43,245 50,255 38,252" fill="#A8C99B" />
              {/* Left → Top */}
              <path d="M45 155 Q 60 95 150 75" fill="none" stroke="#C5DFB8" strokeWidth="2" />
              <polygon points="150,73 142,80 145,68" fill="#A8C99B" />
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-xs sm:text-sm font-medium text-primary/60 text-center leading-tight max-w-[100px]">
                Wird jede Woche besser
              </p>
            </div>

            {/* Cards */}
            {steps.map((step, i) => {
              const positions = [
                "top-0 left-1/2 -translate-x-1/2 -translate-y-1",
                "right-0 top-1/2 -translate-y-1/2 translate-x-1",
                "bottom-0 left-1/2 -translate-x-1/2 translate-y-1",
                "left-0 top-1/2 -translate-y-1/2 -translate-x-10",
              ];
              return (
                <div
                  key={step.label}
                  className={`absolute ${positions[i]} group`}
                >
                  <div className="bg-white border border-sage-light/60 rounded-2xl px-4 py-3 shadow-sm hover:shadow-md hover:border-sage-DEFAULT transition-all duration-200 cursor-default">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sage-pale flex items-center justify-center text-primary flex-shrink-0">
                        {step.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-warm-dark">{step.label}</p>
                        <p className="text-[11px] text-warm-light hidden group-hover:block transition-all">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
    "Was sind gesunde Snacks für unterwegs?",
    "Wie ernähre ich mich in der Schwangerschaft optimal?",
  ];

  return (
    <section className="bg-sage-faint/30 border-y border-sage-light/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-28">
        <div className="text-center mb-14">
          <p className="text-sm font-medium text-primary tracking-wide uppercase mb-3">
            Beispielfragen
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark mb-4">
            Das kannst du fragen
          </h2>
          <p className="text-warm-muted max-w-md mx-auto">
            Von Alltagsfragen bis zum Wochenplan &mdash; probier es einfach aus.
          </p>
        </div>

        <div ref={ref} className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {questions.map((q) => (
            <Link
              key={q}
              href="/sign-up"
              className="group flex items-start gap-3 bg-white border border-sage-light/50 rounded-2xl px-5 py-4 text-sm text-warm-text hover:border-sage-DEFAULT hover:bg-sage-faint/50 hover:shadow-sm transition-all duration-200 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-sage-DEFAULT flex-shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
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
          className={`relative w-12 h-7 rounded-full transition-colors duration-200 cursor-pointer ${yearly ? "bg-primary" : "bg-sage-light"}`}
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
          <span className="text-primary text-xs font-medium ml-1 bg-sage-pale px-2 py-0.5 rounded-full">
            &minus;20%
          </span>
        </span>
      </div>

      <div ref={ref} className="reveal-stagger grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Free */}
        <div className="bg-white rounded-2xl border border-sage-light/60 p-8 flex flex-col">
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
            className="block text-center border-2 border-sage-light text-warm-text px-5 py-3 rounded-full text-sm font-medium hover:border-primary hover:text-primary transition cursor-pointer"
          >
            Kostenlos starten
          </Link>
        </div>

        {/* Basis — highlighted */}
        <div className="bg-white rounded-2xl border-2 border-sage-DEFAULT p-8 flex flex-col relative shadow-lg shadow-sage-DEFAULT/10">
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
            <PricingFeature text="Persönliche Ernährungspläne" highlight />
            <PricingFeature text="Ernährungstagebuch" highlight />
            <PricingFeature text="Gewichts- & Ziel-Tracker" />
            <PricingFeature text="Wöchentlicher KI-Review" />
            <PricingFeature text="Rezeptvorschläge" />
          </ul>
          <Link
            href="/sign-up"
            className="block text-center bg-primary text-white px-5 py-3 rounded-full text-sm font-medium hover:bg-primary-light transition shadow-md shadow-primary/20 cursor-pointer"
          >
            Basis w&auml;hlen
          </Link>
        </div>

        {/* Premium */}
        <div className="bg-white rounded-2xl border border-sage-light/60 p-8 flex flex-col">
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
            <PricingFeature text="Wöchentliche Reviews von Janine" highlight />
            <PricingFeature text="Direktnachrichten an Janine" highlight />
            <PricingFeature text="Prioritäts-Support" />
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
          highlight ? "bg-sage-pale" : "bg-surface-muted"
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
   7b. SPRICH DIREKT MIT JANINE
   ═══════════════════════════════════════ */
function JanineDirectSection() {
  const ref = useScrollReveal();
  const points = [
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "Persönliche Nachrichten",
      desc: "Schreibe Janine direkt in der App und erhalte eine individuelle Antwort.",
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Antwort innerhalb von 24h",
      desc: "Kein Bot, keine Warteschleife — echte Expertise, wenn du sie brauchst.",
    },
    {
      icon: <Heart className="w-5 h-5" />,
      title: "Empathisch & fachlich",
      desc: "Janine kennt dein Profil und gibt dir Rat, der wirklich zu dir passt.",
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-28">
      <div ref={ref} className="reveal">
        <div className="grid md:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-center">
          {/* Left — Photo placeholder */}
          <div className="flex justify-center md:justify-start">
            <div className="w-64 h-72 sm:w-72 sm:h-80 rounded-3xl bg-gradient-to-br from-sage-pale to-accent-warmPale flex items-center justify-center border-2 border-sage-light/50 relative overflow-hidden">
              <span className="text-7xl font-serif font-semibold text-primary/20">J</span>
              <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-sage-light/40">
                <p className="text-xs font-medium text-primary">Janine</p>
                <p className="text-[11px] text-warm-muted">Ernährungswissenschaftlerin</p>
              </div>
            </div>
          </div>

          {/* Right — Text block */}
          <div>
            <p className="text-sm font-medium text-primary tracking-wide uppercase mb-3">
              Premium-Funktion
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark mb-4">
              Sprich direkt mit Janine
            </h2>
            <p className="text-warm-muted leading-relaxed mb-8 max-w-lg">
              Manchmal braucht man mehr als eine KI-Antwort. Im Premium-Plan
              kannst du Janine persönlich schreiben und bekommst fundierte,
              individuelle Beratung.
            </p>

            <div className="space-y-5 mb-10">
              {points.map((point) => (
                <div key={point.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-sage-pale flex items-center justify-center text-primary flex-shrink-0">
                    {point.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-warm-dark mb-0.5">{point.title}</p>
                    <p className="text-sm text-warm-muted leading-relaxed">{point.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-primary-light transition shadow-md shadow-primary/20 cursor-pointer"
            >
              Premium entdecken
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   8. ABOUT JANINE
   ═══════════════════════════════════════ */
function AboutJanineSection() {
  const ref = useScrollReveal();
  return (
    <section className="bg-sage-faint/30 border-y border-sage-light/30">
      <div ref={ref} className="reveal max-w-4xl mx-auto px-4 sm:px-6 py-28">
        <div className="grid md:grid-cols-[auto_1fr] gap-12 items-center">
          {/* Photo placeholder */}
          <div className="flex justify-center md:justify-start">
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-3xl bg-gradient-to-br from-sage-pale to-accent-warmPale flex items-center justify-center border-2 border-sage-light/50">
              <span className="text-5xl font-serif font-semibold text-primary/30">J</span>
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
              Die gesamte Wissensbasis dieser App basiert auf meinem Fachwissen &mdash;
              wissenschaftlich fundiert und pers&ouml;nlich kuratiert.
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
      question: "Ersetzt die App eine echte Ern\u00e4hrungsberatung?",
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
        className="reveal relative overflow-hidden bg-gradient-to-br from-sage-DEFAULT to-sage-light rounded-3xl px-8 py-16 sm:px-16 sm:py-20 text-center"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative">
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-primary mb-5">
            Bereit f&uuml;r fundierte<br className="hidden sm:block" /> Ern&auml;hrungsberatung?
          </h2>
          <p className="text-primary/60 mb-10 max-w-md mx-auto leading-relaxed">
            Erstelle dein Profil und stelle deine erste Frage &mdash;
            kostenlos und unverbindlich.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2.5 bg-primary text-white px-8 py-4 rounded-full font-medium hover:bg-primary-light transition shadow-lg shadow-primary/20 cursor-pointer"
          >
            Jetzt loslegen
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
