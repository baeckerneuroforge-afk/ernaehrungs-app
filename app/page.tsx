import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  BookOpen,
  ArrowRight,
  Heart,
  Shield,
  Leaf,
  Sparkles,
  Check,
  ChevronDown,
  TrendingUp,
  ClipboardList,
  Crown,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-bg via-white to-primary-bg/30" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white border border-primary-bg rounded-full px-4 py-1.5 mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">
                  Adaptiver Ernährungscoach
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
                Dein Ernährungscoach, der{" "}
                <span className="text-primary">aus deinem Alltag lernt</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Nicht nur Tipps – ein System, das deinen <span className="text-gray-900 font-semibold">Ernährungsplan
                jede Woche an dein echtes Essverhalten anpasst</span>. Basierend
                auf dem Fachwissen einer studierten Ernährungswissenschaftlerin,
                abgestimmt auf deine Ziele, Allergien und Vorlieben.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-primary-light transition flex items-center justify-center gap-2"
                >
                  Kostenlos starten
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#preise"
                  className="w-full sm:w-auto border border-gray-200 text-gray-600 px-6 py-3 rounded-xl font-medium text-sm hover:border-primary hover:text-primary transition text-center"
                >
                  Preise ansehen
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Was dich erwartet
            </h2>
            <p className="text-gray-500 mt-2">
              Fundiertes Wissen, individuell auf dich abgestimmt
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Passt sich an dich an"
              description="Dein Tagebuch, Gewichtsverlauf und Ziele fließen in jede Antwort ein. Der Plan wird Woche für Woche besser."
            />
            <FeatureCard
              icon={<ClipboardList className="w-6 h-6" />}
              title="Wöchentlicher Check-in"
              description="Jeden Sonntag dein persönlicher Rückblick: Was lief gut, was kannst du verbessern, worauf du dich nächste Woche fokussieren solltest."
            />
            <FeatureCard
              icon={<BookOpen className="w-6 h-6" />}
              title="Echtes Fachwissen"
              description="Die Wissensbasis wurde von einer studierten Ernährungswissenschaftlerin aufgesetzt – die KI antwortet auf dieser fundierten Grundlage."
            />
          </div>
        </section>

        {/* How it works */}
        <section
          id="wie-es-funktioniert"
          className="bg-white border-y border-gray-100"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                So einfach geht&apos;s
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Step
                num="1"
                title="Profil ausfüllen"
                description="Trage deine Ziele, Allergien und Ernährungsform ein – dauert nur 2 Minuten."
              />
              <Step
                num="2"
                title="Frage stellen"
                description="Frag im Chat alles rund um Ernährung – von Rezeptideen bis Nährstoff-Fragen."
              />
              <Step
                num="3"
                title="Antwort erhalten"
                description="Bekomme eine persönliche, fundierte Antwort die auf dein Profil abgestimmt ist."
              />
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid md:grid-cols-3 gap-6">
            <TrustCard
              icon={<Heart className="w-5 h-5 text-primary" />}
              title="Mit Herz & Verstand"
              text="Hinter der Wissensbasis steht das Fachwissen einer studierten Ernährungswissenschaftlerin – fundiert und verlässlich."
            />
            <TrustCard
              icon={<Shield className="w-5 h-5 text-primary" />}
              title="Deine Daten sind sicher"
              text="Alle Daten werden verschlüsselt gespeichert. Wir verkaufen nichts und teilen nichts."
            />
            <TrustCard
              icon={<Leaf className="w-5 h-5 text-primary" />}
              title="Kein Ersatz für den Arzt"
              text="Bei ernsthaften Beschwerden empfehlen wir immer den Gang zum Arzt. Sicherheit geht vor."
            />
          </div>
        </section>

        {/* Pricing */}
        <section id="preise" className="bg-white border-y border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Wähle deinen Plan
              </h2>
              <p className="text-gray-500 mt-2">
                Starte kostenlos – upgrade wenn du bereit bist
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Free */}
              <div className="bg-surface-bg rounded-2xl border border-gray-100 p-6 flex flex-col">
                <h3 className="font-semibold text-gray-800 text-lg">Starter</h3>
                <div className="mt-3 mb-5">
                  <span className="text-3xl font-bold text-gray-900">0 €</span>
                  <span className="text-gray-500 text-sm ml-1">/ Monat</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  Perfekt zum Ausprobieren – lerne die App kennen.
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  <PricingFeature text="Profil & Onboarding" />
                  <PricingFeature text="5 Chat-Fragen pro Woche" />
                  <PricingFeature text="1 Ernährungsplan-Vorschau" />
                  <PricingFeature text="Basis-Tagebuch" />
                </ul>
                <Link
                  href="/login"
                  className="block text-center border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium text-sm hover:border-primary hover:text-primary transition"
                >
                  Kostenlos starten
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-white rounded-2xl border-2 border-primary p-6 flex flex-col relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-medium px-3 py-1 rounded-full">
                  Beliebteste Wahl
                </div>
                <h3 className="font-semibold text-gray-800 text-lg">Pro</h3>
                <div className="mt-3 mb-1">
                  <span className="text-3xl font-bold text-gray-900">19 €</span>
                  <span className="text-gray-500 text-sm ml-1">/ Monat</span>
                </div>
                <p className="text-xs text-primary font-medium mb-5">
                  oder 149 € / Jahr (spar 2 Monate)
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Dein adaptiver Coach – lernt aus deinem Alltag.
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  <PricingFeature text="Unbegrenzter Chat" highlight />
                  <PricingFeature text="Adaptive Ernährungspläne" highlight />
                  <PricingFeature text="Wöchentlicher Check-in" highlight />
                  <PricingFeature text="Gewichtsverlauf & Ziel-Tracking" />
                  <PricingFeature text="Ernährungstagebuch mit KI-Analyse" />
                  <PricingFeature text="Plan-Anpassungen aus echten Daten" />
                </ul>
                <Link
                  href="/login"
                  className="block text-center bg-primary text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-primary-light transition"
                >
                  Pro starten
                </Link>
              </div>

              {/* Pro+ */}
              <div className="bg-surface-bg rounded-2xl border border-gray-100 p-6 flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800 text-lg">Pro+</h3>
                  <Crown className="w-4 h-4 text-accent-warmLight" />
                </div>
                <div className="mt-3 mb-1">
                  <span className="text-3xl font-bold text-gray-900">49 €</span>
                  <span className="text-gray-500 text-sm ml-1">/ Monat</span>
                </div>
                <p className="text-xs text-gray-500 mb-5">
                  oder 129 € / Quartal
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  KI-Coach + menschliches Sicherheitsnetz.
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  <PricingFeature text="Alles aus Pro" />
                  <PricingFeature text="1x/Monat Review durch Expertin" highlight />
                  <PricingFeature text="Direkte Rückfragen an Beraterin" highlight />
                  <PricingFeature text="Priorisierter Support" />
                  <PricingFeature text="Manuelle Plan-Anpassung bei Sonderfällen" />
                </ul>
                <Link
                  href="/login"
                  className="block text-center border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium text-sm hover:border-primary hover:text-primary transition"
                >
                  Pro+ starten
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Häufige Fragen
            </h2>
          </div>
          <div className="space-y-3">
            <FaqItem
              question="Ersetzt die App eine echte Ernährungsberatung?"
              answer="Nein – und das soll sie auch nicht. Die App basiert auf einer kuratierten Wissensbasis einer studierten Ernährungswissenschaftlerin und gibt fundierte Empfehlungen. Bei medizinischen Fragen, Essstörungen oder Schwangerschaft verweisen wir immer an Fachpersonal. Im Pro+ Tarif hast du zusätzlich Zugang zu einer echten Beraterin."
            />
            <FaqItem
              question="Was unterscheidet euch von anderen Ernährungs-Apps?"
              answer="Die meisten Apps sind Kalorienzähler oder statische Plantools. Unsere App lernt aus deinem echten Essverhalten: Dein Tagebuch, Gewichtsverlauf und Ziele fließen in jede Empfehlung ein. Dein Plan wird wöchentlich besser statt immer gleich zu bleiben."
            />
            <FaqItem
              question="Wie funktioniert der Wochencheck?"
              answer="Jeden Sonntag analysiert die KI dein Ernährungstagebuch und deinen Gewichtsverlauf der letzten 7 Tage. Du bekommst einen persönlichen Rückblick: was gut lief, was du verbessern kannst und einen konkreten Fokus für die nächste Woche."
            />
            <FaqItem
              question="Sind meine Daten sicher?"
              answer="Ja. Alle Daten werden verschlüsselt gespeichert. Wir verkaufen keine Daten und teilen sie nicht mit Dritten. Du kannst dein Konto und alle Daten jederzeit löschen."
            />
            <FaqItem
              question="Kann ich den kostenlosen Plan dauerhaft nutzen?"
              answer="Ja, der Starter-Plan bleibt dauerhaft kostenlos. Du bekommst 5 Chat-Fragen pro Woche und eine Plan-Vorschau. Wenn du mehr willst – adaptive Pläne, Wochenchecks und unbegrenzten Chat – ist Pro der richtige Schritt."
            />
            <FaqItem
              question="Kann ich jederzeit kündigen?"
              answer="Ja, du kannst dein Abo jederzeit zum Ende des Abrechnungszeitraums kündigen. Keine versteckten Gebühren, keine Mindestlaufzeit."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="bg-gradient-to-br from-primary to-primary-light rounded-2xl p-8 sm:p-12 text-center text-white">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Bereit für deine persönliche Beratung?
            </h2>
            <p className="text-white/80 mb-6 max-w-lg mx-auto">
              Erstelle dein Profil und stelle deine erste Frage – kostenlos und
              unverbindlich.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-medium text-sm hover:bg-primary-bg transition"
            >
              Jetzt loslegen
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:border-primary-bg transition">
      <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  num,
  title,
  description,
}: {
  num: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm mx-auto mb-4">
        {num}
      </div>
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

function TrustCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-primary-bg/30 rounded-xl p-5">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <h4 className="font-medium text-gray-800 text-sm mb-1">{title}</h4>
        <p className="text-sm text-gray-500">{text}</p>
      </div>
    </div>
  );
}

function PricingFeature({
  text,
  highlight,
}: {
  text: string;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <Check
        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
          highlight ? "text-primary" : "text-gray-400"
        }`}
      />
      <span
        className={`text-sm ${
          highlight ? "text-gray-800 font-medium" : "text-gray-600"
        }`}
      >
        {text}
      </span>
    </li>
  );
}

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group bg-white rounded-xl border border-gray-100 overflow-hidden">
      <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-gray-800 text-sm">{question}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 pt-0">
        <p className="text-sm text-gray-500 leading-relaxed">{answer}</p>
      </div>
    </details>
  );
}
