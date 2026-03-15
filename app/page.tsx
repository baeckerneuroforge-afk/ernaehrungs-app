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
  Calendar,
  User,
  BookOpen,
  TrendingUp,
  CheckCircle,
  Send,
  RefreshCw,
} from "lucide-react";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
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
        <HowItWorksSection />
        <ClosedLoopSection />
        <ExampleQuestionsSection />
        <PricingSection />
        <AboutJanineSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════
   HERO
   ═══════════════════════════════════════ */
function HeroSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* Left */}
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold text-warm-dark leading-[1.15] mb-6">
            Deine Ernahrungs&shy;beraterin.
            <br />
            <span className="text-primary">Immer dabei.</span>
          </h1>
          <p className="text-lg text-warm-muted leading-relaxed mb-8 max-w-md">
            Fundiertes Fachwissen einer studierten Ernahrungswissenschaftlerin
            — personlich auf dich abgestimmt. Frag was du willst, bekomme
            Antworten die zu dir passen.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2.5 bg-primary text-white px-7 py-3.5 rounded-xl font-medium hover:bg-primary-light transition-all duration-200"
          >
            Kostenlos starten
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-sm text-warm-light mt-4">
            Kein Abo notig · Kostenlos testen
          </p>
        </div>

        {/* Right: Chat Mockup */}
        <div className="relative">
          <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.06] border border-warm-border overflow-hidden">
            {/* Header */}
            <div className="bg-primary px-5 py-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Ernahrungsberatung</p>
                <p className="text-white/60 text-xs">Online</p>
              </div>
            </div>
            {/* Messages */}
            <div className="p-5 space-y-4 bg-surface-bg min-h-[240px]">
              <div className="flex justify-end">
                <div className="bg-primary text-white px-4 py-2.5 rounded-2xl rounded-br-sm max-w-[80%]">
                  <p className="text-sm">Was kann ich als Snack essen wenn ich Laktoseintoleranz habe?</p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary-bg flex items-center justify-center flex-shrink-0 mt-1">
                  <MessageCircle className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-white border border-warm-border px-4 py-3 rounded-2xl rounded-bl-sm max-w-[80%]">
                  <p className="text-sm text-warm-text leading-relaxed mb-2">
                    Hier sind <strong>5 leckere Snack-Ideen</strong> fur dich:
                  </p>
                  <ul className="text-sm text-warm-muted space-y-0.5">
                    <li>1. Nusse & Trockenfruchte-Mix</li>
                    <li>2. Reiswaffeln mit Avocado</li>
                    <li>3. Dunkle Schokolade (ab 70%)</li>
                    <li>4. Hummus mit Gemusesticks</li>
                    <li>5. Laktosefreier Joghurt mit Beeren</li>
                  </ul>
                </div>
              </div>
            </div>
            {/* Input */}
            <div className="px-4 py-3 border-t border-warm-border bg-white flex items-center gap-2">
              <div className="flex-1 bg-surface-muted rounded-lg px-3 py-2">
                <p className="text-xs text-warm-light">Stelle eine Frage...</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Send className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   TRUST BAR
   ═══════════════════════════════════════ */
function TrustBar() {
  const ref = useScrollReveal();
  return (
    <div ref={ref} className="reveal border-y border-warm-border bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-center text-sm text-warm-muted tracking-wide">
          Studierte Ernahrungswissenschaftlerin · Uber 500 wissenschaftliche Quellen · DSGVO-konform
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   FEATURES (2x3)
   ═══════════════════════════════════════ */
function FeaturesSection() {
  const ref = useScrollReveal();
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
      <div className="text-center mb-16">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark mb-3">
          Alles fur bessere Ernahrung
        </h2>
        <p className="text-warm-muted max-w-lg mx-auto">
          Fundiertes Wissen, individuell auf dich abgestimmt
        </p>
      </div>
      <div ref={ref} className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <FeatureCard
          icon={<MessageCircle className="w-5 h-5" />}
          title="KI-Chat"
          description="Stelle jede Frage rund um Ernahrung. Sofort fundierte Antworten — basierend auf deinem Profil, Tagebuch und Zielen."
        />
        <FeatureCard
          icon={<Calendar className="w-5 h-5" />}
          title="Personliche Ernahrungsplane"
          description="KI-generierte Wochenplane abgestimmt auf deine Ziele, Allergien, Vorlieben und echtes Essverhalten."
        />
        <FeatureCard
          icon={<BookOpen className="w-5 h-5" />}
          title="Ernahrungstagebuch"
          description="Erfasse deine Mahlzeiten. Deine Daten fliessen automatisch in Chat und Plane — fur immer bessere Empfehlungen."
        />
        <FeatureCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="Gewichts- & Ziel-Tracker"
          description="Logge dein Gewicht, setze Ziele und verfolge deinen Fortschritt visuell uber Wochen und Monate."
        />
        <FeatureCard
          icon={<CheckCircle className="w-5 h-5" />}
          title="Wochentlicher KI-Review"
          description="Jeden Sonntag: Was lief gut, was kannst du verbessern, Fokus fur die nachste Woche. Warmherzig und fachlich."
        />
        <FeatureCard
          icon={<User className="w-5 h-5" />}
          title="Direktkontakt zu Janine"
          description="Fur tiefergehende Fragen: schreibe Janine direkt in der App. Personliche Antwort von einer echten Expertin."
        />
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl border border-warm-border p-6 hover:shadow-md transition-shadow duration-300">
      <div className="w-10 h-10 rounded-lg bg-primary-bg flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-warm-dark mb-2">{title}</h3>
      <p className="text-sm text-warm-muted leading-relaxed">{description}</p>
    </div>
  );
}

/* ═══════════════════════════════════════
   HOW IT WORKS (4 steps)
   ═══════════════════════════════════════ */
function HowItWorksSection() {
  const ref = useScrollReveal();
  const steps = [
    { num: "1", title: "Profil anlegen", desc: "Ziele, Allergien, Ernahrungsform — dauert 2 Minuten." },
    { num: "2", title: "Frage stellen", desc: "Chatte mit deiner KI-Beraterin oder lass dir einen Plan erstellen." },
    { num: "3", title: "Tagebuch fuhren", desc: "Erfasse was du isst. Die KI lernt dich besser kennen." },
    { num: "4", title: "Besser essen", desc: "Jede Woche bessere Empfehlungen dank Closed-Loop-System." },
  ];
  return (
    <section className="bg-white border-y border-warm-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark mb-3">
            So einfach geht&apos;s
          </h2>
          <p className="text-warm-muted">In vier Schritten zu besserer Ernahrung</p>
        </div>
        <div ref={ref} className="reveal-stagger grid md:grid-cols-4 gap-10 md:gap-6">
          {steps.map((s) => (
            <div key={s.num} className="text-center">
              <div className="font-serif text-4xl font-semibold text-primary mb-3">{s.num}</div>
              <h3 className="font-semibold text-warm-dark mb-2">{s.title}</h3>
              <p className="text-sm text-warm-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   CLOSED LOOP (USP)
   ═══════════════════════════════════════ */
function ClosedLoopSection() {
  const ref = useScrollReveal();
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-24">
      <div ref={ref} className="reveal">
        <div className="text-center mb-14">
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark mb-4">
            Je mehr du teilst, desto besser werde ich.
          </h2>
          <p className="text-warm-muted max-w-2xl mx-auto leading-relaxed">
            Dein Tagebuch, dein Gewichtsverlauf und deine Ziele fliessen in jede Antwort ein.
            Keine generischen Tipps — sondern Empfehlungen die auf deinem echten Verhalten basieren.
          </p>
        </div>

        {/* Loop diagram */}
        <div className="flex justify-center">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80">
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary-bg flex items-center justify-center">
                <RefreshCw className="w-7 h-7 text-primary" />
              </div>
            </div>
            {/* Circle border */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 320">
              <circle cx="160" cy="160" r="130" fill="none" stroke="#E8E5E0" strokeWidth="1.5" strokeDasharray="4 6" />
            </svg>
            {/* Labels */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 bg-white border border-warm-border rounded-lg px-3 py-1.5 shadow-sm">
              <p className="text-xs font-medium text-warm-dark">Tagebuch</p>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 bg-white border border-warm-border rounded-lg px-3 py-1.5 shadow-sm">
              <p className="text-xs font-medium text-warm-dark">Chat</p>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 bg-white border border-warm-border rounded-lg px-3 py-1.5 shadow-sm">
              <p className="text-xs font-medium text-warm-dark">Plan</p>
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 bg-white border border-warm-border rounded-lg px-3 py-1.5 shadow-sm">
              <p className="text-xs font-medium text-warm-dark">Wochencheck</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   EXAMPLE QUESTIONS
   ═══════════════════════════════════════ */
function ExampleQuestionsSection() {
  const ref = useScrollReveal();
  const questions = [
    "Was kann ich abends essen um besser zu schlafen?",
    "Wie bekomme ich genug Protein als Vegetarierin?",
    "Welche Lebensmittel helfen bei Eisenmangel?",
    "Erstelle mir einen Wochenplan ohne Gluten",
    "Was sind gesunde Snacks fur unterwegs?",
    "Wie ernahre ich mich in der Schwangerschaft optimal?",
  ];
  return (
    <section className="bg-white border-y border-warm-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark mb-3">
            Das fragen unsere Nutzer
          </h2>
        </div>
        <div ref={ref} className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {questions.map((q) => (
            <Link
              key={q}
              href="/sign-in"
              className="bg-white border border-primary/20 rounded-xl px-5 py-4 text-sm text-warm-text hover:border-primary hover:shadow-sm transition-all duration-200"
            >
              {q}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   PRICING (3 tiers)
   ═══════════════════════════════════════ */
function PricingSection() {
  const ref = useScrollReveal();
  const [yearly, setYearly] = useState(false);

  return (
    <section id="preise" className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
      <div className="text-center mb-6">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark mb-3">
          Wahle deinen Plan
        </h2>
        <p className="text-warm-muted">
          Starte kostenlos. Upgrade wenn du mehr willst.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-3 mb-14">
        <span className={`text-sm ${!yearly ? "text-warm-dark font-medium" : "text-warm-muted"}`}>Monatlich</span>
        <button
          onClick={() => setYearly(!yearly)}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${yearly ? "bg-primary" : "bg-warm-border"}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${yearly ? "translate-x-6" : "translate-x-0.5"}`} />
        </button>
        <span className={`text-sm ${yearly ? "text-warm-dark font-medium" : "text-warm-muted"}`}>
          Jahrlich <span className="text-primary text-xs font-medium ml-1">Spare 20%</span>
        </span>
      </div>

      <div ref={ref} className="reveal-stagger grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {/* Free */}
        <div className="bg-white rounded-xl border border-warm-border p-7 flex flex-col">
          <h3 className="font-semibold text-warm-dark text-lg">Kostenlos</h3>
          <div className="mt-3 mb-1">
            <span className="text-3xl font-bold text-warm-dark">0 EUR</span>
          </div>
          <p className="text-sm text-warm-muted mb-7 mt-1">Zum Ausprobieren</p>
          <ul className="space-y-3 mb-8 flex-1">
            <PricingFeature text="10 Fragen pro Monat" />
            <PricingFeature text="Basisprofil" />
            <PricingFeature text="Allgemeine Empfehlungen" />
          </ul>
          <Link
            href="/sign-up"
            className="block text-center border border-warm-border text-warm-text px-5 py-2.5 rounded-xl text-sm font-medium hover:border-primary hover:text-primary transition"
          >
            Kostenlos starten
          </Link>
        </div>

        {/* Pro */}
        <div className="bg-white rounded-xl border-2 border-primary p-7 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-medium px-3 py-1 rounded-full">
            Beliebt
          </div>
          <h3 className="font-semibold text-warm-dark text-lg">Pro</h3>
          <div className="mt-3 mb-1">
            <span className="text-3xl font-bold text-warm-dark">{yearly ? "15,99" : "19,99"} EUR</span>
            <span className="text-warm-muted text-sm ml-1">/ Monat</span>
          </div>
          <p className="text-sm text-warm-muted mb-7 mt-1">Fur bewusste Ernahrung</p>
          <ul className="space-y-3 mb-8 flex-1">
            <PricingFeature text="Unbegrenzte Fragen" highlight />
            <PricingFeature text="Personliche Ernahrungsplane" highlight />
            <PricingFeature text="Ernahrungstagebuch" highlight />
            <PricingFeature text="Gewichts-Tracker" />
            <PricingFeature text="Ziel-Tracker" />
            <PricingFeature text="Wochentlicher KI-Review" />
            <PricingFeature text="Rezeptvorschlage" />
          </ul>
          <Link
            href="/sign-up"
            className="block text-center bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-light transition"
          >
            Pro wahlen
          </Link>
        </div>

        {/* Pro+ */}
        <div className="bg-white rounded-xl border border-warm-border p-7 flex flex-col">
          <h3 className="font-semibold text-warm-dark text-lg">Pro+</h3>
          <div className="mt-3 mb-1">
            <span className="text-3xl font-bold text-warm-dark">{yearly ? "39,99" : "49,99"} EUR</span>
            <span className="text-warm-muted text-sm ml-1">/ Monat</span>
          </div>
          <p className="text-sm text-warm-muted mb-7 mt-1">Mit personlicher Betreuung</p>
          <ul className="space-y-3 mb-8 flex-1">
            <PricingFeature text="Alles in Pro" />
            <PricingFeature text="Wochentliche Reviews von Janine" highlight />
            <PricingFeature text="Direktnachrichten an Janine" highlight />
            <PricingFeature text="Prioritats-Support" />
            <PricingFeature text="Erweiterte Planoptionen" />
          </ul>
          <Link
            href="/sign-up"
            className="block text-center bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-light transition"
          >
            Pro+ wahlen
          </Link>
        </div>
      </div>
    </section>
  );
}

function PricingFeature({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${highlight ? "text-primary" : "text-warm-light"}`} />
      <span className={`text-sm ${highlight ? "text-warm-dark font-medium" : "text-warm-muted"}`}>{text}</span>
    </li>
  );
}

/* ═══════════════════════════════════════
   ABOUT JANINE
   ═══════════════════════════════════════ */
function AboutJanineSection() {
  const ref = useScrollReveal();
  return (
    <section className="bg-white border-y border-warm-border">
      <div ref={ref} className="reveal max-w-3xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-accent-warmPale flex items-center justify-center mx-auto mb-6 border-2 border-accent-warm/20">
            <span className="text-2xl font-serif font-semibold text-accent-warm">J</span>
          </div>
          <h2 className="font-serif text-3xl font-semibold text-warm-dark mb-6">
            Uber Janine
          </h2>
          <p className="text-warm-muted leading-relaxed max-w-xl mx-auto">
            Studierte Ernahrungswissenschaftlerin mit Leidenschaft fur individuelle Beratung.
            Die gesamte Wissensbasis dieser App basiert auf meinem Fachwissen — uber 500
            wissenschaftliche Quellen, personlich kuratiert. Ich glaube daran, dass gute
            Ernahrung einfach sein kann, wenn man die richtige Unterstutzung hat.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   FAQ
   ═══════════════════════════════════════ */
function FaqSection() {
  const ref = useScrollReveal();
  return (
    <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-24">
      <div className="text-center mb-14">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-warm-dark">
          Haufige Fragen
        </h2>
      </div>
      <div ref={ref} className="reveal space-y-2">
        <FaqItem
          question="Was unterscheidet diese App von ChatGPT?"
          answer="Die Wissensbasis wurde von einer studierten Ernahrungswissenschaftlerin kuratiert. Dazu fliessen dein Profil, Tagebuch und Gewichtsverlauf in jede Antwort ein — das kann kein generischer Chatbot."
        />
        <FaqItem
          question="Werden meine Daten an die KI weitergegeben?"
          answer="Dein Name wird nie an die KI gesendet. Nur anonymisierte Profildaten (Ziele, Allergien) fliessen ein, damit die Antworten zu dir passen. Vollstandig DSGVO-konform."
        />
        <FaqItem
          question="Kann ich die App auch vegan/vegetarisch nutzen?"
          answer="Ja. Im Profil gibst du deine Ernahrungsform an und alle Empfehlungen werden darauf abgestimmt."
        />
        <FaqItem
          question="Ersetzt die App eine echte Ernahrungsberatung?"
          answer="Die App bietet fundiertes Fachwissen, ersetzt aber keine arztliche Beratung. Bei ernsthaften Beschwerden empfehlen wir immer den Gang zum Arzt."
        />
        <FaqItem
          question="Was ist der Wochencheck?"
          answer="Jeden Sonntag analysiert die KI dein Tagebuch der letzten Woche und gibt dir einen personlichen Ruckblick: Was lief gut, was kannst du verbessern, und einen Fokus fur die nachste Woche."
        />
        <FaqItem
          question="Kann ich Janine direkt schreiben?"
          answer="Ja, im Pro+ Plan kannst du Janine direkt in der App eine Nachricht schreiben und bekommst eine personliche Antwort."
        />
      </div>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-warm-border">
      <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-warm-dark">{question}</span>
        <ChevronDown className="w-4 h-4 text-warm-light flex-shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-5">
        <p className="text-sm text-warm-muted leading-relaxed">{answer}</p>
      </div>
    </details>
  );
}

/* ═══════════════════════════════════════
   CTA
   ═══════════════════════════════════════ */
function CtaSection() {
  const ref = useScrollReveal();
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-24">
      <div ref={ref} className="reveal bg-primary rounded-2xl px-8 py-14 sm:px-14 sm:py-16 text-center text-white">
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold mb-4">
          Bereit fur fundierte Ernahrungsberatung?
        </h2>
        <p className="text-white/70 mb-8 max-w-md mx-auto">
          Erstelle dein Profil und stelle deine erste Frage — kostenlos und unverbindlich.
        </p>
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 bg-white text-primary px-7 py-3 rounded-xl font-medium hover:bg-surface-bg transition"
        >
          Jetzt loslegen
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
