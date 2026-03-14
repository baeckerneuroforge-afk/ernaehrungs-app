"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  ArrowRight,
  Check,
  ChevronDown,
  MessageCircle,
  Calendar,
  User,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  ClipboardList,
  Sparkles,
  Send,
  Crown,
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
      { threshold: 0.15 }
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
        {/* ──────────── HERO ──────────── */}
        <section className="relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-bg/60 via-surface-bg to-accent-warmPale/30" />
            <div className="absolute top-20 right-10 w-72 h-72 bg-primary-bg/40 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-10 w-64 h-64 bg-accent-warmPale/40 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: Text */}
              <div>
                <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-primary-pale rounded-full px-4 py-1.5 mb-6">
                  <Sparkles className="w-3.5 h-3.5 text-accent-warm" />
                  <span className="text-sm text-warm-text font-medium">
                    Von einer Ernährungswissenschaftlerin
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold text-warm-dark leading-[1.1] mb-5 tracking-tight">
                  Deine Ernährungs&shy;beraterin.{" "}
                  <span className="text-primary">Immer dabei.</span>
                </h1>

                <p className="text-lg text-warm-muted mb-8 leading-relaxed max-w-lg">
                  Fundiertes Fachwissen einer studierten Ernährungswissenschaftlerin
                  — persönlich auf dich abgestimmt. Frag was du willst, bekomme
                  Antworten die zu dir passen.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-3 mb-8">
                  <Link
                    href="/sign-up"
                    className="w-full sm:w-auto bg-primary text-white px-7 py-3.5 rounded-2xl font-semibold text-base hover:bg-primary-light transition-all hover:shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    Kostenlos starten
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="#preise"
                    className="w-full sm:w-auto text-warm-muted px-7 py-3.5 rounded-2xl font-medium text-base hover:text-primary transition text-center"
                  >
                    Preise ansehen
                  </a>
                </div>

                <p className="text-sm text-warm-light">
                  Kostenlos starten — kein Abo nötig
                </p>
              </div>

              {/* Right: Chat Mockup */}
              <div className="relative">
                <div className="bg-white rounded-3xl shadow-2xl shadow-primary/10 border border-warm-border overflow-hidden max-w-sm mx-auto lg:max-w-none">
                  {/* Mockup header */}
                  <div className="bg-primary px-5 py-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Ernährungsberatung</p>
                      <p className="text-white/70 text-xs">Online</p>
                    </div>
                  </div>
                  {/* Messages */}
                  <div className="p-5 space-y-4 bg-surface-bg">
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="bg-primary text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%]">
                        <p className="text-sm">Was kann ich als Snack essen wenn ich Laktoseintoleranz habe?</p>
                      </div>
                    </div>
                    {/* Assistant message */}
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary-bg flex items-center justify-center flex-shrink-0 mt-1">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="bg-white border border-warm-border px-4 py-3 rounded-2xl rounded-bl-md max-w-[85%]">
                        <p className="text-sm text-warm-text leading-relaxed">
                          Hier sind <strong>5 leckere Snack-Ideen</strong> für dich:
                        </p>
                        <ul className="text-sm text-warm-text mt-2 space-y-1">
                          <li>1. Nüsse & Trockenfrüchte-Mix</li>
                          <li>2. Reiswaffeln mit Avocado</li>
                          <li>3. Dunkle Schokolade (ab 70%)</li>
                          <li>4. Hummus mit Gemüsesticks</li>
                          <li>5. Laktosefreier Joghurt mit Beeren</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  {/* Input bar */}
                  <div className="px-4 py-3 border-t border-warm-border bg-white flex items-center gap-2">
                    <div className="flex-1 bg-surface-muted rounded-xl px-3 py-2">
                      <p className="text-xs text-warm-light">Stelle eine Frage...</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                      <Send className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg border border-warm-border px-4 py-2.5 hidden sm:flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-bg flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-xs font-medium text-warm-text">Wissenschaftlich fundiert</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ──────────── TRUST / JANINE ──────────── */}
        <TrustSection />

        {/* ──────────── FEATURES ──────────── */}
        <FeaturesSection />

        {/* ──────────── HOW IT WORKS ──────────── */}
        <HowItWorksSection />

        {/* ──────────── EXAMPLE QUESTIONS ──────────── */}
        <ExampleQuestionsSection />

        {/* ──────────── PRICING ──────────── */}
        <PricingSection />

        {/* ──────────── FAQ ──────────── */}
        <FaqSection />

        {/* ──────────── CTA ──────────── */}
        <CtaSection />
      </main>

      <Footer />
    </div>
  );
}

/* ════════════════════════════════════════════
   TRUST SECTION
   ════════════════════════════════════════════ */
function TrustSection() {
  const ref = useScrollReveal();
  return (
    <section className="bg-white border-y border-warm-border">
      <div ref={ref} className="reveal max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-6">
          Das Fachwissen hinter der App
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-warm-dark mb-8">
          Aufgebaut auf dem Wissen von Janine —{" "}
          <span className="text-primary">studierte Ernährungswissenschaftlerin</span>
        </h2>

        {/* Janine Avatar */}
        <div className="flex justify-center mb-8">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-bg to-primary-pale flex items-center justify-center border-4 border-white shadow-lg">
            <span className="text-3xl font-bold text-primary">JB</span>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
          <TrustBadge
            icon={<GraduationCap className="w-5 h-5 text-primary" />}
            text="Studierte Ernährungswissenschaftlerin"
          />
          <TrustBadge
            icon={<BookOpen className="w-5 h-5 text-primary" />}
            text="Über 500 wissenschaftliche Quellen"
          />
          <TrustBadge
            icon={<ShieldCheck className="w-5 h-5 text-primary" />}
            text="DSGVO-konform & sicher"
          />
        </div>
      </div>
    </section>
  );
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-surface-bg rounded-full px-5 py-2.5 border border-warm-border">
      {icon}
      <span className="text-sm font-medium text-warm-text">{text}</span>
    </div>
  );
}

/* ════════════════════════════════════════════
   FEATURES
   ════════════════════════════════════════════ */
function FeaturesSection() {
  const ref = useScrollReveal();
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      <div className="text-center mb-14">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          Was dich erwartet
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-warm-dark">
          Alles was du für bessere Ernährung brauchst
        </h2>
      </div>
      <div ref={ref} className="reveal-stagger grid md:grid-cols-3 gap-6">
        <FeatureCard
          icon={<MessageCircle className="w-6 h-6" />}
          color="green"
          title="Chatte über Ernährung"
          description="Stelle jede Frage — von Nährstoffen bis Rezeptideen. Sofort fundierte Antworten, freundlich erklärt."
        />
        <FeatureCard
          icon={<Calendar className="w-6 h-6" />}
          color="amber"
          title="Dein persönlicher Plan"
          description="Erhalte einen Ernährungsplan der zu deinen Zielen, Allergien und Vorlieben passt. Keine generischen Pläne."
        />
        <FeatureCard
          icon={<User className="w-6 h-6" />}
          color="green"
          title="Frag Janine direkt"
          description="Für tiefergehende Fragen: schreibe Janine direkt in der App und erhalte eine persönliche Antwort."
        />
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  color,
  title,
  description,
}: {
  icon: React.ReactNode;
  color: "green" | "amber";
  title: string;
  description: string;
}) {
  const bgColor = color === "green" ? "bg-primary-bg" : "bg-accent-warmPale";
  const iconColor = color === "green" ? "text-primary" : "text-accent-warm";
  const borderHover = color === "green" ? "hover:border-primary-pale" : "hover:border-accent-warmPale";

  return (
    <div className={`bg-white rounded-2xl border border-warm-border p-7 hover:shadow-lg transition-all duration-300 ${borderHover} group`}>
      <div className={`w-14 h-14 rounded-2xl ${bgColor} flex items-center justify-center ${iconColor} mb-5 group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <h3 className="font-bold text-warm-dark text-lg mb-2">{title}</h3>
      <p className="text-warm-muted leading-relaxed">{description}</p>
    </div>
  );
}

/* ════════════════════════════════════════════
   HOW IT WORKS
   ════════════════════════════════════════════ */
function HowItWorksSection() {
  const ref = useScrollReveal();
  return (
    <section className="bg-white border-y border-warm-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            In 3 Schritten
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-warm-dark">
            So einfach geht&apos;s
          </h2>
        </div>

        <div ref={ref} className="reveal-stagger grid md:grid-cols-3 gap-8 md:gap-6 steps-connector relative">
          <StepCard
            num="1"
            icon={<ClipboardList className="w-6 h-6 text-primary" />}
            title="Profil anlegen"
            description="Trage deine Ziele, Allergien und Ernährungsform ein. Dauert nur 2 Minuten."
          />
          <StepCard
            num="2"
            icon={<MessageCircle className="w-6 h-6 text-primary" />}
            title="Frage stellen"
            description="Chatte mit deiner KI-Beraterin oder lass dir einen Plan erstellen."
          />
          <StepCard
            num="3"
            icon={<Check className="w-6 h-6 text-primary" />}
            title="Besser essen"
            description="Setze die Empfehlungen um und tracke deinen Fortschritt."
          />
        </div>
      </div>
    </section>
  );
}

function StepCard({
  num,
  icon,
  title,
  description,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center relative z-10">
      <div className="w-14 h-14 rounded-2xl bg-primary-bg border-2 border-primary-pale flex items-center justify-center mx-auto mb-5 relative">
        {icon}
        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-sm">
          {num}
        </span>
      </div>
      <h3 className="font-bold text-warm-dark text-lg mb-2">{title}</h3>
      <p className="text-warm-muted max-w-xs mx-auto">{description}</p>
    </div>
  );
}

/* ════════════════════════════════════════════
   EXAMPLE QUESTIONS
   ════════════════════════════════════════════ */
function ExampleQuestionsSection() {
  const ref = useScrollReveal();
  const questions = [
    "Was kann ich abends essen um besser zu schlafen?",
    "Wie bekomme ich genug Protein als Vegetarierin?",
    "Welche Lebensmittel helfen bei Eisenmangel?",
    "Erstelle mir einen Wochenplan ohne Gluten",
    "Was sind gesunde Snacks für unterwegs?",
    "Wie kann ich mich in der Schwangerschaft optimal ernähren?",
  ];

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
      <div className="text-center mb-12">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          Inspiration
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-warm-dark">
          Das fragen unsere Nutzer
        </h2>
      </div>
      <div ref={ref} className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {questions.map((q) => (
          <Link
            key={q}
            href="/sign-in"
            className="group bg-white border border-primary-pale/60 rounded-2xl px-5 py-4 text-sm text-warm-text hover:border-primary hover:shadow-md transition-all duration-300 flex items-start gap-3"
          >
            <MessageCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <span className="leading-relaxed">{q}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════
   PRICING
   ════════════════════════════════════════════ */
function PricingSection() {
  const ref = useScrollReveal();
  return (
    <section id="preise" className="bg-white border-y border-warm-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Preise
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-warm-dark">
            Starte kostenlos. Upgrade wenn du mehr willst.
          </h2>
        </div>

        <div ref={ref} className="reveal-stagger grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <div className="bg-surface-bg rounded-3xl border border-warm-border p-8 flex flex-col">
            <h3 className="font-bold text-warm-dark text-xl">Kostenlos</h3>
            <div className="mt-3 mb-1">
              <span className="text-4xl font-extrabold text-warm-dark">0 €</span>
              <span className="text-warm-muted text-sm ml-2">/ Monat</span>
            </div>
            <p className="text-warm-muted mb-8 mt-2">
              Perfekt zum Ausprobieren
            </p>
            <ul className="space-y-3 mb-8 flex-1">
              <PricingFeature text="Unbegrenzt chatten" />
              <PricingFeature text="Profil anlegen" />
              <PricingFeature text="Basis-Empfehlungen" />
            </ul>
            <Link
              href="/sign-up"
              className="block text-center border-2 border-warm-border text-warm-text px-5 py-3 rounded-2xl font-semibold hover:border-primary hover:text-primary transition"
            >
              Kostenlos starten
            </Link>
          </div>

          {/* Premium */}
          <div className="bg-white rounded-3xl border-2 border-primary p-8 flex flex-col relative shadow-xl shadow-primary/5">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
              <Crown className="w-3 h-3" />
              Premium
            </div>
            <h3 className="font-bold text-warm-dark text-xl">Premium</h3>
            <div className="mt-3 mb-1">
              <span className="text-4xl font-extrabold text-warm-dark">9,99 €</span>
              <span className="text-warm-muted text-sm ml-2">/ Monat</span>
            </div>
            <p className="text-warm-muted mb-8 mt-2">
              Dein vollwertiger Ernährungscoach
            </p>
            <ul className="space-y-3 mb-8 flex-1">
              <PricingFeature text="Persönliche Ernährungspläne" highlight />
              <PricingFeature text="Direkter Kontakt zu Janine" highlight />
              <PricingFeature text="Rezeptvorschläge" highlight />
              <PricingFeature text="Fortschritts-Tracking" />
              <PricingFeature text="Wöchentlicher Check-in" />
            </ul>
            <Link
              href="/sign-up"
              className="block text-center bg-primary text-white px-5 py-3 rounded-2xl font-semibold hover:bg-primary-light transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              Premium starten
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingFeature({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${highlight ? "bg-primary-bg" : "bg-surface-muted"}`}>
        <Check className={`w-3 h-3 ${highlight ? "text-primary" : "text-warm-light"}`} />
      </div>
      <span className={`text-sm ${highlight ? "text-warm-dark font-medium" : "text-warm-muted"}`}>
        {text}
      </span>
    </li>
  );
}

/* ════════════════════════════════════════════
   FAQ
   ════════════════════════════════════════════ */
function FaqSection() {
  const ref = useScrollReveal();
  return (
    <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
      <div className="text-center mb-12">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          FAQ
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-warm-dark">
          Häufige Fragen
        </h2>
      </div>
      <div ref={ref} className="reveal space-y-3">
        <FaqItem
          question="Ersetzt die App eine echte Ernährungsberatung?"
          answer="Nein – und das soll sie auch nicht. Die App basiert auf einer kuratierten Wissensbasis einer studierten Ernährungswissenschaftlerin und gibt fundierte Empfehlungen. Bei medizinischen Fragen oder Essstörungen verweisen wir immer an Fachpersonal. Im Premium-Tarif hast du zusätzlich direkten Kontakt zu Janine."
        />
        <FaqItem
          question="Wie funktioniert die KI-Beratung?"
          answer="Du stellst eine Frage im Chat und bekommst sofort eine fundierte Antwort. Die KI greift auf über 500 wissenschaftliche Quellen zurück und berücksichtigt dein persönliches Profil — deine Ziele, Allergien und Ernährungsform."
        />
        <FaqItem
          question="Sind meine Daten sicher?"
          answer="Ja. Alle Daten werden verschlüsselt gespeichert und wir senden keine persönlich identifizierbaren Daten an externe Dienste. Du kannst dein Konto und alle Daten jederzeit löschen. Vollständig DSGVO-konform."
        />
        <FaqItem
          question="Kann ich den kostenlosen Plan dauerhaft nutzen?"
          answer="Ja, der kostenlose Plan bleibt dauerhaft kostenlos. Du kannst unbegrenzt chatten und bekommst Basis-Empfehlungen. Wenn du persönliche Ernährungspläne und direkten Kontakt zu Janine willst, ist Premium der richtige Schritt."
        />
        <FaqItem
          question="Kann ich jederzeit kündigen?"
          answer="Ja, du kannst dein Abo jederzeit zum Ende des Abrechnungszeitraums kündigen. Keine versteckten Gebühren, keine Mindestlaufzeit."
        />
        <FaqItem
          question="Wer steckt hinter der App?"
          answer="Die Wissensbasis wurde von Janine aufgebaut — einer studierten Ernährungswissenschaftlerin. Die App wird laufend weiterentwickelt und die KI-Antworten regelmäßig auf fachliche Richtigkeit geprüft."
        />
      </div>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group bg-white rounded-2xl border border-warm-border overflow-hidden hover:shadow-sm transition">
      <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-warm-dark">{question}</span>
        <ChevronDown className="w-4 h-4 text-warm-light flex-shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 pt-0">
        <p className="text-warm-muted leading-relaxed">{answer}</p>
      </div>
    </details>
  );
}

/* ════════════════════════════════════════════
   CTA
   ════════════════════════════════════════════ */
function CtaSection() {
  const ref = useScrollReveal();
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      <div ref={ref} className="reveal bg-gradient-to-br from-primary to-primary-light rounded-3xl p-8 sm:p-14 text-center text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            Bereit für fundierte Ernährungsberatung?
          </h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto text-lg">
            Erstelle dein Profil und stelle deine erste Frage — kostenlos und
            unverbindlich.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-white text-primary px-8 py-3.5 rounded-2xl font-bold text-base hover:bg-surface-bg transition-all hover:shadow-lg"
          >
            Jetzt loslegen
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
