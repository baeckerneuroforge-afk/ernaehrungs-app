"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Menu,
  Lightbulb,
  Info,
  MessageCircle,
  CalendarDays,
  Calculator,
  BookOpen,
  Sparkles,
  Camera,
  Scale,
  LineChart,
  Mail,
  HelpCircle,
  Check,
  Crown,
  Zap,
  Heart,
  Target,
  Users,
  Package,
  Star,
} from "lucide-react";

type Section = {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
};

const SECTIONS: Section[] = [
  { id: "was-ist-nutriva", label: "Was ist Nutriva?" },
  { id: "erste-schritte", label: "Die ersten Schritte" },
  {
    id: "funktionen",
    label: "Alle Funktionen",
    children: [
      { id: "ki-chat", label: "KI-Chat" },
      { id: "ernaehrungsplan", label: "Ernährungsplan" },
      { id: "kalorienrechner", label: "Kalorienrechner" },
      { id: "tagebuch", label: "Tagebuch" },
      { id: "smart-log", label: "Smart Log" },
      { id: "foto-analyse", label: "Foto-Analyse" },
      { id: "gewichtstracker", label: "Gewichtstracker" },
      { id: "reviews", label: "Wochenreview & Monatsreport" },
      { id: "nachrichten-janine", label: "Direktnachrichten an Janine" },
    ],
  },
  { id: "pakete", label: "Die Pakete im Detail" },
  { id: "faq", label: "FAQ" },
  { id: "support", label: "Support & Kontakt" },
];

export function HilfeContent() {
  const [activeId, setActiveId] = useState<string>("was-ist-nutriva");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Scroll-spy: track which section is currently in view
  useEffect(() => {
    const allIds: string[] = [];
    SECTIONS.forEach((s) => {
      allIds.push(s.id);
      s.children?.forEach((c) => allIds.push(c.id));
    });

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId((visible[0].target as HTMLElement).id);
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      }
    );

    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <header className="mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 bg-primary-pale text-primary rounded-full px-3.5 py-1.5 mb-4 text-xs font-semibold tracking-wide">
          <HelpCircle className="w-3.5 h-3.5" />
          Hilfe-Center
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-semibold text-ink leading-tight tracking-tight">
          So holst du das Beste aus Nutriva
        </h1>
        <p className="text-ink-muted mt-3 max-w-2xl text-base sm:text-lg font-light leading-relaxed">
          Ein ausführliches Tutorial mit allem, was du über die App wissen
          musst — von den ersten Schritten bis zu den Feinheiten der einzelnen
          Pakete.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Sidebar */}
        <Sidebar
          activeId={activeId}
          mobileOpen={mobileOpen}
          onToggleMobile={() => setMobileOpen((o) => !o)}
          onNavigate={() => setMobileOpen(false)}
        />

        {/* Content */}
        <article className="flex-1 min-w-0 max-w-[720px] space-y-20">
          <WasIstNutriva />
          <ErsteSchritte />
          <Funktionen />
          <Pakete />
          <CreditTopUps />
          <Faq />
          <Support />
        </article>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════════════════ */
function Sidebar({
  activeId,
  mobileOpen,
  onToggleMobile,
  onNavigate,
}: {
  activeId: string;
  mobileOpen: boolean;
  onToggleMobile: () => void;
  onNavigate: () => void;
}) {
  const isActive = (id: string) => activeId === id;

  return (
    <aside className="lg:w-[240px] lg:flex-shrink-0">
      {/* Mobile toggle */}
      <button
        onClick={onToggleMobile}
        className="lg:hidden w-full flex items-center justify-between gap-3 bg-white border border-border rounded-2xl px-4 py-3 mb-4 text-sm font-medium text-ink hover:border-primary/30 transition"
      >
        <span className="flex items-center gap-2">
          <Menu className="w-4 h-4 text-primary" />
          Inhaltsverzeichnis
        </span>
        <ChevronDown
          className={`w-4 h-4 text-ink-muted transition-transform ${
            mobileOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <nav
        className={`lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto ${
          mobileOpen ? "block" : "hidden lg:block"
        }`}
      >
        <ul className="bg-white lg:bg-transparent border border-border lg:border-none rounded-2xl lg:rounded-none p-3 lg:p-0 space-y-0.5">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={onNavigate}
                className={`block px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  isActive(section.id)
                    ? "bg-primary-pale text-primary font-semibold"
                    : "text-ink-muted hover:text-ink hover:bg-surface-muted"
                }`}
              >
                {section.label}
              </a>
              {section.children && (
                <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
                  {section.children.map((child) => (
                    <li key={child.id}>
                      <a
                        href={`#${child.id}`}
                        onClick={onNavigate}
                        className={`block px-3 py-1.5 rounded-lg text-[13px] transition-all duration-150 ${
                          isActive(child.id)
                            ? "bg-primary-pale text-primary font-medium"
                            : "text-ink-muted hover:text-ink hover:bg-surface-muted"
                        }`}
                      >
                        {child.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED BUILDING BLOCKS
   ═══════════════════════════════════════════════════════════════ */
function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="text-xs font-semibold text-primary tracking-[0.18em] uppercase mb-2">
          {eyebrow}
        </p>
      )}
      <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-ink leading-tight tracking-tight">
        {title}
      </h2>
    </div>
  );
}

function TipBox({
  variant = "tip",
  children,
}: {
  variant?: "tip" | "info";
  children: React.ReactNode;
}) {
  const styles =
    variant === "info"
      ? {
          wrap: "bg-[#EEF4FA] border-[#CEDEEB]",
          iconWrap: "bg-[#D5E4F2] text-[#2C5282]",
          label: "text-[#2C5282]",
          icon: <Info className="w-4 h-4" />,
          labelText: "Info",
        }
      : {
          wrap: "bg-accent-warmPale border-accent-warmLight/60",
          iconWrap: "bg-amber-100 text-accent-warm",
          label: "text-accent-warm",
          icon: <Lightbulb className="w-4 h-4" />,
          labelText: "Tipp",
        };

  return (
    <div
      className={`flex gap-3 rounded-2xl border p-4 sm:p-5 ${styles.wrap}`}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.iconWrap}`}
      >
        {styles.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-[11px] font-bold tracking-wider uppercase mb-1 ${styles.label}`}
        >
          {styles.labelText}
        </p>
        <div className="text-sm text-ink leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function PlanBadges({ plans }: { plans: ("free" | "basis" | "premium")[] }) {
  const config = {
    free: { label: "Kostenlos", cls: "bg-surface-muted text-ink-muted" },
    basis: { label: "Basis", cls: "bg-primary-pale text-primary" },
    premium: {
      label: "Premium",
      cls: "bg-accent-warmPale text-accent-warm",
    },
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-ink-faint uppercase tracking-wider font-semibold mr-1">
        Verfügbar in
      </span>
      {plans.map((p) => (
        <span
          key={p}
          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${config[p].cls}`}
        >
          {p === "premium" && <Crown className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" />}
          {config[p].label}
        </span>
      ))}
    </div>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-ink-muted leading-[1.7] text-[15px]">{children}</p>
  );
}

/* ═══════════════════════════════════════════════════════════════
   1. WAS IST NUTRIVA
   ═══════════════════════════════════════════════════════════════ */
function WasIstNutriva() {
  return (
    <section id="was-ist-nutriva" className="scroll-mt-20 space-y-6">
      <SectionHeader eyebrow="Überblick" title="Was ist Nutriva-AI?" />
      <Paragraph>
        Nutriva ist eine persönliche Ernährungsberatungs-Plattform, entwickelt
        von Ernährungswissenschaftlerin Janine Richter. Die App kombiniert
        Janines Fachwissen mit KI — du bekommst Antworten, Pläne und
        Empfehlungen, die zu deinem Profil, deinen Zielen und deinem Alltag
        passen. Alle Werkzeuge greifen ineinander: was du im Tagebuch erfasst,
        fließt in den Chat ein; was der Kalorienrechner berechnet, wird Basis
        für deinen Plan.
      </Paragraph>
      <Paragraph>
        Nutriva ist <strong>kein</strong> Ersatz für ärztliche Beratung. Wenn
        du eine chronische Krankheit hast, schwanger bist oder unter einer
        Essstörung leidest, sprich bitte mit deinem Arzt oder deiner Ärztin —
        die App ergänzt solche Beratungen, ersetzt sie aber nicht. Wir stellen
        auch keine Diagnosen und geben keine medizinischen Anweisungen.
      </Paragraph>

      <div className="grid sm:grid-cols-3 gap-4 pt-2">
        <OverviewCard
          icon={<Users className="w-5 h-5" />}
          title="Für wen?"
          body="Für alle, die ihr Gewicht verändern, gesünder essen oder einfach mehr Klarheit in ihrer Ernährung haben wollen."
        />
        <OverviewCard
          icon={<Package className="w-5 h-5" />}
          title="Was brauchst du?"
          body="Nur die App und dein Ziel. Kein Vorwissen, keine Waage, keine komplizierten Regeln."
        />
        <OverviewCard
          icon={<Star className="w-5 h-5" />}
          title="Was ist besonders?"
          body="Alle Tools greifen ineinander. Antworten und Pläne basieren auf Janines Expertise — nicht auf generischem Internet-Wissen."
        />
      </div>
    </section>
  );
}

function OverviewCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
      <div className="w-10 h-10 rounded-xl bg-primary-pale text-primary flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-serif text-lg font-semibold text-ink mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-ink-muted leading-relaxed">{body}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. ERSTE SCHRITTE
   ═══════════════════════════════════════════════════════════════ */
function ErsteSchritte() {
  const steps: {
    title: string;
    body: string;
    tip?: React.ReactNode;
    tipVariant?: "tip" | "info";
  }[] = [
    {
      title: "Registriere dich kostenlos",
      body: "Melde dich mit deiner Email an und leg dein Profil an: Alter, Größe, aktuelles Gewicht, dein Ziel. Das dauert zwei Minuten. Alle Angaben bleiben privat — dein Name wird nie an die KI weitergegeben.",
      tip: (
        <>
          Du bekommst sofort <strong>15 Credits gratis</strong> zum
          Ausprobieren. Damit kannst du den Chat testen und einen ersten
          Ernährungsplan erstellen.
        </>
      ),
    },
    {
      title: "Setze dein Kalorienziel",
      body: "Im Kalorienrechner wird dein persönlicher Tagesbedarf (TDEE) auf Basis von Größe, Gewicht, Alter und Aktivität berechnet. Daraus leitest du dein Tagesziel ab — ob du abnehmen, halten oder zunehmen willst.",
      tipVariant: "info",
      tip: (
        <>
          Für nachhaltiges Abnehmen empfehlen wir ein Defizit von{" "}
          <strong>300–500 kcal pro Tag</strong>. Mehr ist oft kontraproduktiv:
          der Körper schaltet auf Sparflamme und du verlierst Muskeln statt
          Fett.
        </>
      ),
    },
    {
      title: "Lass dir einen Ernährungsplan erstellen",
      body: "Im Bereich „Ernährungsplan“ wählst du, wie viele Tage der Plan abdecken soll (1 bei Free, 3 bei Basis, 7 bei Premium), wie viele Mahlzeiten, ob vegan/vegetarisch, welche Allergien berücksichtigt werden sollen. Der Plan landet inklusive Einkaufsliste in deinem Konto.",
      tip: (
        <>
          Nutze den Plan als Rahmen, nicht als Gefängnis. Wenn du mal etwas
          anderes isst — trag es einfach im Tagebuch ein. Der Plan passt sich
          an, keine Sorge.
        </>
      ),
    },
    {
      title: "Trag deine Mahlzeiten ein",
      body: "Du hast zwei Wege: manuell im Tagebuch (Mahlzeit, Menge, Kalorien) oder per Smart Log (Premium). Je genauer du trackst, desto passender werden die Empfehlungen. Die Makros — Protein, Kohlenhydrate, Fett — werden automatisch mitgerechnet.",
      tipVariant: "info",
      tip: (
        <>
          Makros zeigen dir die <strong>Zusammensetzung</strong> deiner
          Ernährung. Wer zum Beispiel abnimmt, sollte auf ausreichend Protein
          achten — das sättigt und schützt die Muskelmasse.
        </>
      ),
    },
    {
      title: "Check deinen Fortschritt",
      body: "Im Gewichtstracker trägst du regelmäßig dein Gewicht ein — 1× pro Woche reicht. Sonntags kommt der Wochenreview mit deinen Takeaways. Zum Monatsanfang bekommst du automatisch den Monatsreport. So siehst du, ob dein Tempo passt oder du etwas anpassen solltest.",
      tip: (
        <>
          Wiege dich immer zur gleichen Zeit (morgens nach dem Toilettengang,
          nüchtern). Einzelne Tageswerte schwanken stark — schau auf den
          7-Tage-Durchschnitt, nicht auf das Tagesgewicht.
        </>
      ),
    },
  ];

  return (
    <section id="erste-schritte" className="scroll-mt-20 space-y-6">
      <SectionHeader eyebrow="Tutorial" title="So startest du" />
      <Paragraph>
        Du musst nichts Kompliziertes einrichten. Die folgenden fünf Schritte
        führen dich vom leeren Profil zum funktionierenden Alltag. Rechne mit
        ungefähr 15 Minuten für das Setup.
      </Paragraph>

      <div className="space-y-6 pt-2">
        {steps.map((step, i) => (
          <div key={step.title} className="flex gap-4 sm:gap-5">
            {/* Number */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-primary text-white font-serif font-bold text-lg flex items-center justify-center shadow-card">
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className="w-0.5 flex-1 bg-border mt-2 min-h-[1.5rem]" />
              )}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 pb-4 space-y-3">
              <h3 className="font-serif text-xl sm:text-2xl font-semibold text-ink leading-tight">
                {step.title}
              </h3>
              <p className="text-ink-muted leading-[1.7] text-[15px]">
                {step.body}
              </p>
              {step.tip && (
                <TipBox variant={step.tipVariant}>{step.tip}</TipBox>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. ALLE FUNKTIONEN
   ═══════════════════════════════════════════════════════════════ */
function Funktionen() {
  return (
    <section id="funktionen" className="scroll-mt-20 space-y-6">
      <SectionHeader eyebrow="Features" title="Alle Funktionen" />
      <Paragraph>
        Jede Funktion im Detail — was sie macht, wie sie funktioniert und in
        welchem Paket sie enthalten ist. Du findest am Ende jedes Abschnitts
        einen praktischen Tipp.
      </Paragraph>

      <div className="space-y-14 pt-4">
        <FeatureKiChat />
        <FeatureErnaehrungsplan />
        <FeatureKalorienrechner />
        <FeatureTagebuch />
        <FeatureSmartLog />
        <FeatureFotoAnalyse />
        <FeatureGewichtstracker />
        <FeatureReviews />
        <FeatureNachrichtenJanine />
      </div>
    </section>
  );
}

function FeatureHeader({
  icon,
  title,
  summary,
}: {
  icon: React.ReactNode;
  title: string;
  summary: string;
}) {
  return (
    <div className="flex items-start gap-4 mb-4">
      <div className="w-12 h-12 rounded-2xl bg-primary-pale text-primary flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-serif text-2xl font-semibold text-ink leading-tight mb-1">
          {title}
        </h3>
        <p className="text-ink-muted leading-relaxed">{summary}</p>
      </div>
    </div>
  );
}

function FeatureKiChat() {
  return (
    <div id="ki-chat" className="scroll-mt-20 space-y-4">
      <FeatureHeader
        icon={<MessageCircle className="w-6 h-6" />}
        title="KI-Chat"
        summary="Dein persönlicher Ansprechpartner für alle Ernährungsfragen — jederzeit erreichbar."
      />
      <Paragraph>
        Der Chat ist das Herzstück der App. Du stellst eine Frage, die KI
        antwortet. Die Antworten basieren auf Janines kuratierter
        Wissensbasis mit über 466 Fachinhalten und berücksichtigen dein
        Profil: deine Ziele, Allergien, Ernährungsform, Krankheiten und was
        du zuletzt im Tagebuch erfasst hast.
      </Paragraph>
      <Paragraph>
        Typische Fragen: „Was kann ich abends essen, wenn ich Laktose nicht
        vertrage?“, „Gib mir ein Rezept mit unter 600 Kalorien und viel
        Protein.“, „Warum stagniert mein Gewicht trotz Defizit?“. Jede
        Nachricht kostet 1 Credit.
      </Paragraph>
      <PlanBadges plans={["free", "basis", "premium"]} />
      <TipBox>
        Je mehr die KI über dich weiß, desto besser antwortet sie. Trag dein
        Profil vollständig aus und fülle regelmäßig dein Tagebuch — das
        merkt man an der Qualität der Antworten deutlich.
      </TipBox>
    </div>
  );
}

function FeatureErnaehrungsplan() {
  return (
    <div id="ernaehrungsplan" className="scroll-mt-20 space-y-4">
      <FeatureHeader
        icon={<CalendarDays className="w-6 h-6" />}
        title="Ernährungsplan"
        summary="Ein personalisierter Essensplan mit Frühstück, Mittag, Abendessen und Snacks — inklusive Einkaufsliste."
      />
      <Paragraph>
        Du gibst an, wie viele Tage der Plan abdecken soll, wie viele
        Mahlzeiten pro Tag, welche Ernährungsform (normal, vegetarisch,
        vegan, etc.), welche Allergien oder Unverträglichkeiten und ob du
        bestimmte Zutaten vermeiden willst. Die KI baut daraus einen Plan,
        der zu deinem Kalorienziel passt.
      </Paragraph>
      <Paragraph>
        Die Länge hängt vom Paket ab: <strong>Kostenlos</strong> = 1 Tag,{" "}
        <strong>Basis</strong> = 3 Tage, <strong>Premium</strong> = 7 Tage.
        Jeder Plan enthält automatisch eine Einkaufsliste (als Text oder in
        Premium interaktiv zum Abhaken).
      </Paragraph>
      <Paragraph>
        Der Verbrauch liegt je nach Länge und Detailgrad bei{" "}
        <strong>2–5 Credits</strong> pro Plan.
      </Paragraph>
      <PlanBadges plans={["free", "basis", "premium"]} />
      <TipBox>
        Erstelle deinen Plan am Wochenende und geh dann einkaufen. Wer den
        Kühlschrank vorbereitet hat, hält sich viel eher an seinen Plan als
        jemand, der spontan improvisieren muss.
      </TipBox>
    </div>
  );
}

function FeatureKalorienrechner() {
  return (
    <div id="kalorienrechner" className="scroll-mt-20 space-y-4">
      <FeatureHeader
        icon={<Calculator className="w-6 h-6" />}
        title="Kalorienrechner"
        summary="Berechnet dein persönliches Tagesziel auf Basis von TDEE, Aktivität und gewünschtem Defizit."
      />
      <Paragraph>
        Der Rechner ermittelt zuerst deinen Grundumsatz (BMR) und daraus
        deinen Gesamtbedarf (TDEE) — die Kalorien, die du an einem typischen
        Tag verbrauchst. Von dort aus ziehst du ein Defizit ab (für
        Abnahme), legst einen Überschuss drauf (für Zunahme) oder bleibst
        beim Bedarf (für Halten).
      </Paragraph>
      <Paragraph>
        In <strong>Basis</strong> und <strong>Premium</strong> bekommst du
        zusätzlich einen Slider für dein Defizit mit Gesundheitswarnungen
        bei zu aggressiven Werten, plus eine Zeitplan-Berechnung: „Mein Ziel
        bis zum 01.08.“ zeigt dir, wie realistisch dein Zeitfenster ist.
      </Paragraph>
      <PlanBadges plans={["free", "basis", "premium"]} />
      <TipBox variant="info">
        Der Rechner ist eine Schätzung, keine exakte Messung. Wenn du nach 2
        Wochen mit +/– 0 kg mehr oder weniger verlierst als erwartet, passe
        dein Ziel um etwa 100–200 kcal an.
      </TipBox>
    </div>
  );
}

function FeatureTagebuch() {
  return (
    <div id="tagebuch" className="scroll-mt-20 space-y-4">
      <FeatureHeader
        icon={<BookOpen className="w-6 h-6" />}
        title="Tagebuch"
        summary="Erfasst deine täglichen Mahlzeiten mit Kalorien und Makronährstoffen."
      />
      <Paragraph>
        Du trägst pro Mahlzeit ein: Beschreibung („Haferflocken mit Beeren
        und Joghurt“), Uhrzeit, ungefähre Kalorien und — wenn du es genau
        wissen willst — Protein, Kohlenhydrate und Fett. Die App rechnet
        alles zusammen und zeigt dir in einer Progress-Bar, wo du heute
        stehst.
      </Paragraph>
      <Paragraph>
        Die Progress-Bar zeigt deinen Fortschritt zum Kalorienziel. Deine
        Makros siehst du als IST-Werte — wir geben keine festen Targets
        vor, weil die ideale Makro-Verteilung individuell stark variiert.
      </Paragraph>
      <PlanBadges plans={["free", "basis", "premium"]} />
      <TipBox>
        Trag Mahlzeiten möglichst direkt nach dem Essen ein — nicht abends
        aus dem Gedächtnis. Was man nach 8 Stunden „vergisst“, sind meist
        die 200 kcal, die den Unterschied machen.
      </TipBox>
    </div>
  );
}

function FeatureSmartLog() {
  return (
    <div id="smart-log" className="scroll-mt-20 space-y-4">
      <FeatureHeader
        icon={<Sparkles className="w-6 h-6" />}
        title="Smart Log"
        summary="Du beschreibst deinen Tag in einem Satz — die KI erstellt strukturierte Tagebuch-Einträge."
      />
      <Paragraph>
        Statt jede Mahlzeit einzeln einzutippen, schreibst du einfach:
        „Haferflocken zum Frühstück, mittags einen großen Salat mit Hähnchen
        und abends ein Brot mit Käse.“ Die KI erkennt die drei Mahlzeiten,
        schätzt Kalorien und Makros und legt sie als Einträge im Tagebuch
        an.
      </Paragraph>
      <Paragraph>
        Das funktioniert auch bei mehreren Snacks, ungefähren Mengenangaben
        („eine halbe Tafel Schokolade“) und Restaurantbesuchen. Jeder Smart
        Log kostet <strong>2 Credits</strong>.
      </Paragraph>
      <PlanBadges plans={["premium"]} />
      <TipBox>
        Nutze Smart Log abends als Tages-Rückblick. Zwei Minuten tippen
        statt 15 Minuten mit Einzeleinträgen — und die Genauigkeit reicht
        für Tracking im Alltag völlig aus.
      </TipBox>
    </div>
  );
}

function FeatureFotoAnalyse() {
  return (
    <div id="foto-analyse" className="scroll-mt-20 space-y-4">
      <FeatureHeader
        icon={<Camera className="w-6 h-6" />}
        title="Foto-Analyse"
        summary="Foto vom Essen machen — die KI erkennt die Zutaten und schätzt Kalorien und Makros."
      />
      <Paragraph>
        Du fotografierst deinen Teller, die App nutzt die Vision-Fähigkeiten
        von Claude Opus 4.7 für die Erkennung. Du bekommst eine Schätzung
        der Komponenten, Gesamtkalorien und Makros — und kannst den
        Vorschlag direkt ins Tagebuch übernehmen.
      </Paragraph>
      <Paragraph>
        Funktioniert besonders gut bei Gerichten mit sichtbaren Zutaten
        (Salate, Bowls, einfache Teller). Bei Eintöpfen, Aufläufen oder
        stark verarbeiteten Gerichten ist die Schätzung ungenauer — dann
        hilft es, im Kommentar grob zu beschreiben, was drin ist. Kostet{" "}
        <strong>3 Credits</strong> pro Analyse.
      </Paragraph>
      <PlanBadges plans={["premium"]} />
      <TipBox>
        Fotografiere von oben mit gutem Licht und ohne Schatten. Je klarer
        du die einzelnen Komponenten siehst, desto genauer die
        KI-Schätzung.
      </TipBox>
    </div>
  );
}

function FeatureGewichtstracker() {
  return (
    <div id="gewichtstracker" className="scroll-mt-20 space-y-4">
      <FeatureHeader
        icon={<Scale className="w-6 h-6" />}
        title="Gewichtstracker"
        summary="Regelmäßige Gewichtseinträge mit Chart-Verlauf, Durchschnitten und Trend-Analyse."
      />
      <Paragraph>
        Du trägst dein Gewicht ein — einmal pro Woche reicht, öfter ist
        auch in Ordnung. Der Tracker zeigt deinen Verlauf als Linien-Chart,
        das du nach Zeiträumen filtern kannst: Woche, Monat, 3 Monate, Jahr.
        Dazu bekommst du den 7-Tage-Durchschnitt (aussagekräftiger als
        Tageswerte) und einen Trend („–0,3 kg pro Woche“).
      </Paragraph>
      <Paragraph>
        Wenn du ein Zielgewicht gesetzt hast, siehst du zusätzlich eine
        Progress-Bar: wie weit bist du gekommen, wie weit noch bis zum
        Ziel, und bei gesetztem Zieldatum auch die Prognose.
      </Paragraph>
      <PlanBadges plans={["free", "basis", "premium"]} />
      <TipBox variant="info">
        Tagesgewicht schwankt um 1–2 kg durch Wasser, Salz und
        Darminhalt — komplett normal. Erst der Wochen-Durchschnitt zeigt
        den echten Trend.
      </TipBox>
    </div>
  );
}

function FeatureReviews() {
  return (
    <div id="reviews" className="scroll-mt-20 space-y-4">
      <FeatureHeader
        icon={<LineChart className="w-6 h-6" />}
        title="Wochenreview & Monatsreport"
        summary="Automatische Reflexionen zu deiner Ernährung — wöchentlich und monatlich, basierend auf deinem Tagebuch und Gewichtsverlauf."
      />
      <Paragraph>
        Der <strong>Wochenreview</strong> fasst deine letzten 7 Tage
        zusammen: durchschnittliche Kalorien, Gewichtsentwicklung, 3
        konkrete Takeaways — was lief gut, was kannst du besser machen,
        was ist der Fokus für die nächste Woche.
      </Paragraph>
      <Paragraph>
        Der <strong>Monatsreport</strong> läuft automatisch zum
        Monatsanfang und enthält zusätzlich eine 3-Monats-Trendanalyse,
        eine Gewichtsprognose und eine Muster-Analyse deiner Makros. In{" "}
        <strong>Premium</strong> kommen erweiterte Einblicke dazu — zum
        Beispiel, an welchen Wochentagen du typischerweise über dein Ziel
        kommst.
      </Paragraph>
      <PlanBadges plans={["free", "basis", "premium"]} />
      <TipBox>
        Lies den Wochenreview am Montagmorgen, nicht am Sonntagabend. Die
        Empfehlungen für die kommende Woche wirken besser, wenn sie zeitlich
        näher am Umsetzungsmoment liegen.
      </TipBox>
    </div>
  );
}

function FeatureNachrichtenJanine() {
  return (
    <div id="nachrichten-janine" className="scroll-mt-20 space-y-4">
      <FeatureHeader
        icon={<Mail className="w-6 h-6" />}
        title="Direktnachrichten an Janine"
        summary="Als Premium-Mitglied schreibst du direkt an Janine — keine KI, sondern eine echte Ernährungswissenschaftlerin."
      />
      <Paragraph>
        Du schreibst deine Frage im Chat-Tab „An Janine“. Janine liest die
        Nachrichten selbst und antwortet innerhalb von 24 Stunden. Das ist
        ideal für Situationen, bei denen die KI an ihre Grenzen kommt —
        komplexe gesundheitliche Themen, sehr spezifische
        Ernährungsfragen, oder wenn du einfach eine zweite Meinung haben
        willst.
      </Paragraph>
      <Paragraph>
        Wichtig: Janine kann keine medizinischen Diagnosen stellen. Bei
        ernsten gesundheitlichen Beschwerden bleibt dein Arzt oder deine
        Ärztin die erste Anlaufstelle.
      </Paragraph>
      <PlanBadges plans={["premium"]} />
      <TipBox>
        Formuliere deine Frage so konkret wie möglich — also nicht „Wie
        nehme ich ab?“, sondern „Ich mache seit 6 Wochen ein Defizit von
        400 kcal, verliere die ersten 3 Wochen 2 kg, jetzt steht die Waage
        — was kann das sein?“. Je mehr Kontext, desto hilfreicher die
        Antwort.
      </TipBox>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. PAKETE
   ═══════════════════════════════════════════════════════════════ */
function Pakete() {
  return (
    <section id="pakete" className="scroll-mt-20 space-y-6">
      <SectionHeader
        eyebrow="Pakete"
        title="Welches Paket passt zu dir?"
      />
      <Paragraph>
        Alle drei Pakete funktionieren ohne Mindestlaufzeit — du kannst
        jederzeit wechseln oder kündigen. Das Free-Paket reicht zum
        Ausprobieren und leichten Tracking. Wer regelmäßig Pläne nutzt,
        ist im Basis-Paket gut aufgehoben. Premium lohnt sich, wenn du
        Foto-Tracking nutzt oder den Kontakt zu Janine möchtest.
      </Paragraph>

      <div className="grid gap-5 md:grid-cols-3 pt-2">
        <PackageCard variant="free" />
        <PackageCard variant="basis" />
        <PackageCard variant="premium" />
      </div>
    </section>
  );
}

function PackageCard({ variant }: { variant: "free" | "basis" | "premium" }) {
  const config = {
    free: {
      name: "Kostenlos",
      price: "€0",
      priceSub: "/ Monat",
      tagline: "Zum Ausprobieren und leichten Tracking",
      features: [
        "15 Credits pro Monat",
        "KI-Chat (Sonnet-Modell)",
        "Ernährungsplan: 1 Tag",
        "Tagebuch mit Kalorien & Makros",
        "Gewichtstracker (alle Features)",
        "Kalorienrechner (Basis-Version)",
        "Wochenreview (Basis)",
        "Monatsreport (Basis)",
        "Chat-History: 5 Sessions, 30 Tage",
      ],
      examples: [
        "15 Chat-Nachrichten",
        "Oder: 5 Chats + 1 Ernährungsplan + 1 Wochenreview",
      ],
      cardCls: "bg-white border border-border",
      nameCls: "text-ink",
      priceCls: "text-ink",
      checkBg: "bg-surface-muted",
      checkText: "text-ink-muted",
    },
    basis: {
      name: "Basis",
      price: "€15,99",
      priceSub: "/ Monat",
      tagline: "Aktives Tracking, Pläne, kontinuierliche Unterstützung",
      badge: "Beliebt",
      features: [
        "60 Credits pro Monat",
        "Alles aus Kostenlos, plus:",
        "Ernährungsplan: 3 Tage",
        "Kalorienrechner mit Zeitplan & Slider",
        "Gesundheitswarnungen bei aggressivem Defizit",
        "Einkaufsliste (Text)",
        "Chat-History: 20 Sessions, 90 Tage",
      ],
      examples: [
        "30 Chats + 2 Ernährungspläne + 4 Wochenreviews",
      ],
      cardCls:
        "bg-gradient-to-b from-white to-primary-faint/40 border-2 border-primary shadow-xl shadow-primary/10",
      nameCls: "text-ink",
      priceCls: "text-ink",
      checkBg: "bg-primary-pale",
      checkText: "text-primary",
    },
    premium: {
      name: "Premium",
      price: "€49,99",
      priceSub: "/ Monat",
      tagline: "Heavy-User, Foto-Tracking, persönlicher Kontakt zu Janine",
      badge: "Premium",
      features: [
        "250 Credits pro Monat",
        "Alles aus Basis, plus:",
        "Ernährungsplan: 7 Tage",
        "Smart Log (Beschreibung → Einträge)",
        "Foto-Analyse (Opus 4.7 Vision)",
        "Chat-Bild-Upload (Opus 4.7)",
        "Restaurant-Guide (Speisekarte fotografieren)",
        "Interaktive Einkaufsliste (abhaken)",
        "CSV-Import aus anderen Apps",
        "PDF-Export",
        "Erweiterter Monatsreport mit 3-Monats-Trend & Prognose",
        "KI-Coaching-Mail jeden Montag",
        "Direktnachrichten an Janine (24h Antwort)",
        "Unbegrenzte Chat-History",
        "Prioritäts-Support",
      ],
      examples: [
        "100 Chats + 20 Chat-Bilder + 30 Foto-Analysen + 4 Ernährungspläne + 4 Wochenreviews",
      ],
      cardCls:
        "bg-white border border-accent-warmLight/60 shadow-lg shadow-amber-600/5",
      nameCls: "text-accent-warm",
      priceCls: "text-ink",
      checkBg: "bg-accent-warmPale",
      checkText: "text-accent-warm",
    },
  }[variant];

  return (
    <div className={`relative rounded-3xl p-6 sm:p-7 flex flex-col ${config.cardCls}`}>
      {variant === "basis" && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[11px] font-semibold px-3.5 py-1 rounded-full shadow-md whitespace-nowrap">
          {(config as { badge?: string }).badge}
        </div>
      )}
      {variant === "premium" && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent-warm to-amber-600 text-white text-[11px] font-semibold px-3.5 py-1 rounded-full shadow-md whitespace-nowrap inline-flex items-center gap-1">
          <Crown className="w-3 h-3" />
          {(config as { badge?: string }).badge}
        </div>
      )}

      <div className="mb-5">
        <h3 className={`font-serif text-2xl font-semibold mb-1 ${config.nameCls}`}>
          {config.name}
        </h3>
        <p className="text-sm text-ink-muted">{config.tagline}</p>
      </div>

      <div className="mb-5">
        <span className="font-serif text-4xl font-semibold text-ink">
          {config.price}
        </span>
        <span className="text-ink-muted text-sm ml-1">{config.priceSub}</span>
      </div>

      <ul className="space-y-2.5 mb-5 flex-1">
        {config.features.map((f, i) => {
          const isHeader = f.startsWith("Alles aus");
          return (
            <li key={i} className="flex items-start gap-2.5">
              {isHeader ? (
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ChevronRight className="w-3.5 h-3.5 text-ink-faint" />
                </div>
              ) : (
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${config.checkBg}`}
                >
                  <Check className={`w-3 h-3 ${config.checkText}`} />
                </div>
              )}
              <span
                className={`text-sm leading-relaxed ${
                  isHeader
                    ? "text-ink-muted font-semibold italic"
                    : "text-ink"
                }`}
              >
                {f}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="pt-4 border-t border-border">
        <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-2">
          Credit-Beispiel
        </p>
        <ul className="space-y-1">
          {config.examples.map((e, i) => (
            <li key={i} className="text-xs text-ink-muted leading-relaxed">
              {e}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CreditTopUps() {
  const packs = [
    { credits: 15, price: "€2,99", label: "Nachschub" },
    { credits: 40, price: "€5,99", label: "Spar-Paket", popular: true },
    { credits: 100, price: "€11,99", label: "Mega-Paket", best: true },
  ];
  return (
    <section className="space-y-6">
      <div>
        <h3 className="font-serif text-2xl font-semibold text-ink mb-2">
          Credit-Top-Ups
        </h3>
        <Paragraph>
          Reichen die monatlichen Credits nicht? Du kannst jederzeit Credits
          nachkaufen — auch im Free-Tier, völlig unabhängig vom Plan.
          Top-up-Credits verfallen nicht am Monatsende.
        </Paragraph>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {packs.map((p) => (
          <div
            key={p.credits}
            className={`bg-white border rounded-2xl p-5 relative ${
              p.best
                ? "border-primary shadow-md"
                : p.popular
                  ? "border-primary/40"
                  : "border-border"
            }`}
          >
            {p.popular && (
              <span className="absolute -top-2 left-5 bg-primary-pale text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Beliebt
              </span>
            )}
            {p.best && (
              <span className="absolute -top-2 left-5 bg-primary text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Bester Wert
              </span>
            )}
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <p className="text-xs text-ink-faint uppercase tracking-wider font-semibold">
                {p.label}
              </p>
            </div>
            <p className="font-serif text-2xl font-semibold text-ink">
              {p.credits} Credits
            </p>
            <p className="text-sm text-ink-muted mt-1">für {p.price}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   5. FAQ
   ═══════════════════════════════════════════════════════════════ */
function Faq() {
  const faqs: { q: string; a: React.ReactNode }[] = [
    {
      q: "Was kostet die App wirklich? Gibt es versteckte Kosten?",
      a: (
        <>
          Nein, keine versteckten Kosten. Free ist dauerhaft kostenlos (15
          Credits/Monat inklusive). Basis 15,99 €/Monat, Premium 49,99
          €/Monat. Credit-Top-Ups sind optional. Alle Preise enthalten die
          gesetzliche Mehrwertsteuer.
        </>
      ),
    },
    {
      q: "Kann ich jederzeit kündigen?",
      a: (
        <>
          Ja. Es gibt keine Mindestlaufzeit. Du kannst dein Abo in den
          Einstellungen mit einem Klick kündigen. Dein Zugang bleibt bis
          zum Ende des bezahlten Zeitraums aktiv, danach wechselst du
          automatisch in den Free-Plan.
        </>
      ),
    },
    {
      q: "Was passiert mit meinen Daten, wenn ich kündige?",
      a: (
        <>
          Dein Account bleibt bestehen — du wechselst nur in den Free-Plan.
          Dein Profil, Tagebuch, Chat-Verlauf und Gewichtstracker bleiben
          erhalten, du kannst sie jederzeit weiter nutzen. Wenn du den
          Account vollständig löschen willst, geht das in den
          Einstellungen unter „Gefahrenbereich“.
        </>
      ),
    },
    {
      q: "Ist meine Ernährungs-Information sicher?",
      a: (
        <>
          Ja. Dein Name wird nie an die KI übermittelt. Profildaten (Alter,
          Gewicht, Ziele, Allergien) werden nur anonymisiert
          verarbeitet — genug, um die Antworten persönlich zu machen,
          aber ohne direkte Zuordnung zu deinem Namen.
        </>
      ),
    },
    {
      q: "Wo werden meine Daten gespeichert?",
      a: (
        <>
          Auf Servern in der EU (Supabase in Frankfurt). Die gesamte
          Verarbeitung ist DSGVO-konform. Details findest du in unserer{" "}
          <Link href="/datenschutz" className="text-primary hover:underline">
            Datenschutzerklärung
          </Link>
          .
        </>
      ),
    },
    {
      q: "Welche KI-Modelle nutzt Nutriva?",
      a: (
        <>
          Im Free- und Basis-Plan nutzen wir schnelle Modelle für Chat und
          Pläne. Im Premium-Plan kommt für Foto-Analysen und
          Chat-Bild-Upload Claude Opus 4.7 mit seinen Vision-Fähigkeiten zum
          Einsatz — das ist aktuell eines der besten Modelle für
          Bilderkennung.
        </>
      ),
    },
    {
      q: "Ersetzt Nutriva eine Ernährungsberatung beim Arzt?",
      a: (
        <>
          Nein. Die App gibt dir fundiertes Wissen und persönliche
          Empfehlungen, ersetzt aber keine ärztliche oder therapeutische
          Beratung. Bei gesundheitlichen Beschwerden solltest du immer
          einen Arzt, eine Ärztin oder einen qualifizierten Therapeuten
          aufsuchen.
        </>
      ),
    },
    {
      q: "Was, wenn ich Diabetes oder eine chronische Krankheit habe?",
      a: (
        <>
          Die App kann allgemeine Empfehlungen geben und weiß mit deinem
          Profil, dass du z.B. Diabetes hast. Sie ersetzt aber nicht
          deinen Diabetologen oder Hausarzt. Kläre konkrete
          Behandlungsthemen immer medizinisch ab.
        </>
      ),
    },
    {
      q: "Kann Nutriva mir bei Essstörungen helfen?",
      a: (
        <>
          Nein. Bei Essstörungen (Anorexie, Bulimie, Binge Eating) raten wir
          ausdrücklich davon ab, die App zu nutzen, und bitten dich, dich an
          eine Fachstelle oder einen Therapeuten zu wenden. Kalorientracking
          kann bei Essstörungen die Symptome verschlimmern.
        </>
      ),
    },
    {
      q: "Kann ich die App auch ohne Abo nutzen?",
      a: (
        <>
          Ja. Der Free-Plan ist dauerhaft verfügbar, ohne zeitliche
          Begrenzung. Du bekommst jeden Monat 15 Credits und kannst alle
          Kernfunktionen (Chat, Tagebuch, Tracker, Ernährungsplan mit 1
          Tag) nutzen.
        </>
      ),
    },
    {
      q: "Ist Nutriva für Vegetarier und Veganer geeignet?",
      a: (
        <>
          Ja. Im Profil gibst du deine Ernährungsform an — die KI richtet
          Empfehlungen, Pläne und Rezepte entsprechend aus. Auch
          Mischformen (pescetarisch, flexitarisch) werden unterstützt.
        </>
      ),
    },
    {
      q: "Wie genau ist die Foto-Analyse?",
      a: (
        <>
          Bei gut sichtbaren Zutaten (Bowls, Salate, einfache Teller)
          erreichen wir eine Genauigkeit von ±15 % bei den Kalorien. Bei
          Eintöpfen, Aufläufen und stark verarbeiteten Gerichten wird es
          ungenauer — dann hilft eine kurze Beschreibung zusätzlich.
        </>
      ),
    },
    {
      q: "Wie viele Credits brauche ich wirklich?",
      a: (
        <>
          Das hängt stark davon ab, wie du die App nutzt. Grober Richtwert:
          Wer die App nur passiv nutzt (Tagebuch, Tracker), kommt mit dem
          Free-Tier aus. Wer regelmäßig Pläne erstellt und 1–2× pro Woche
          chattet, ist im Basis-Plan gut aufgehoben. Wer täglich chattet
          und Fotos analysiert, braucht Premium.
        </>
      ),
    },
    {
      q: "Kann ich zwischen Paketen wechseln?",
      a: (
        <>
          Ja, jederzeit. Ein Upgrade wird sofort aktiv — du bekommst die
          neuen Credits anteilig zum verbleibenden Monat. Ein Downgrade
          wird zum Ende der aktuellen Abrechnungsperiode wirksam. Keine
          Gebühren für den Wechsel.
        </>
      ),
    },
    {
      q: "Gibt es eine Geld-zurück-Garantie?",
      a: (
        <>
          Innerhalb der ersten 14 Tage nach Abschluss eines Abos kannst du
          von deinem Widerrufsrecht Gebrauch machen und dein Geld zurück
          bekommen (sofern du das Abo nicht aktiv zur sofortigen
          Freischaltung genutzt hast — siehe AGB für Details).
        </>
      ),
    },
    {
      q: "Was ist der Unterschied zu MyFitnessPal oder Yazio?",
      a: (
        <>
          MyFitnessPal und Yazio sind Kalorientracker mit riesigen
          Lebensmittel-Datenbanken. Nutriva ist zusätzlich eine
          Beratungs-Plattform: du kannst Fragen stellen, Pläne erstellen
          lassen, Janine direkt schreiben (Premium). Wenn du aus MFP oder
          Yazio wechselst, kannst du deine Daten per CSV-Import übernehmen
          (Premium-Feature).
        </>
      ),
    },
  ];

  return (
    <section id="faq" className="scroll-mt-20 space-y-6">
      <SectionHeader eyebrow="Häufige Fragen" title="FAQ" />
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <FaqItem key={i} question={faq.q}>
            {faq.a}
          </FaqItem>
        ))}
      </div>
    </section>
  );
}

function FaqItem({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 ${
        open
          ? "border-primary/40 shadow-sm"
          : "border-border hover:border-primary/20"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-start justify-between gap-4 w-full px-5 py-4 text-left group"
        aria-expanded={open}
      >
        <span className="text-[15px] font-semibold text-ink group-hover:text-primary transition-colors leading-snug">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-ink-faint flex-shrink-0 mt-1 transition-transform duration-200 ${
            open ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{
          maxHeight: open
            ? `${contentRef.current?.scrollHeight ?? 600}px`
            : "0",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="text-sm text-ink-muted leading-[1.7] px-5 pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   6. SUPPORT
   ═══════════════════════════════════════════════════════════════ */
function Support() {
  return (
    <section id="support" className="scroll-mt-20 space-y-6">
      <SectionHeader eyebrow="Kontakt" title="Support & Kontakt" />
      <Paragraph>
        Du findest deine Antwort nicht hier? Wir helfen dir gerne weiter. Je
        nach Dringlichkeit und Plan hast du verschiedene Wege uns zu
        erreichen.
      </Paragraph>

      <div className="grid gap-4 md:grid-cols-3 pt-2">
        <SupportCard
          icon={<HelpCircle className="w-5 h-5" />}
          title="Hilfe-Center"
          body="Diese Seite. Such über die Sidebar oder lies den Tutorial-Abschnitt."
          action={{
            href: "#was-ist-nutriva",
            label: "Zum Anfang",
          }}
        />
        <SupportCard
          icon={<Mail className="w-5 h-5" />}
          title="Support-Mail"
          body="Schreib uns eine Nachricht. Wir antworten innerhalb von 48 Stunden."
          action={{
            href: "mailto:hallo@nutriva-ai.de",
            label: "hallo@nutriva-ai.de",
            external: true,
          }}
        />
        <SupportCard
          icon={<Heart className="w-5 h-5" />}
          title="Direkt an Janine"
          body="Nur für Premium-Mitglieder. Antwort innerhalb von 24 Stunden."
          action={{
            href: "/chat",
            label: "Premium ansehen",
          }}
          premium
        />
      </div>

      <div className="bg-primary-faint border border-primary-pale rounded-2xl p-5 sm:p-6 mt-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-card">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink mb-0.5">
              Dir ist etwas aufgefallen?
            </p>
            <p className="text-sm text-ink-muted leading-relaxed">
              Die App ist noch in aktiver Entwicklung. Feedback und
              Fehler-Meldungen hilft uns enorm — schreib einfach an{" "}
              <a
                href="mailto:hallo@nutriva-ai.de"
                className="text-primary font-medium hover:underline"
              >
                hallo@nutriva-ai.de
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SupportCard({
  icon,
  title,
  body,
  action,
  premium,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: { href: string; label: string; external?: boolean };
  premium?: boolean;
}) {
  return (
    <div
      className={`bg-white border rounded-2xl p-5 flex flex-col ${
        premium
          ? "border-accent-warmLight/60"
          : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            premium
              ? "bg-accent-warmPale text-accent-warm"
              : "bg-primary-pale text-primary"
          }`}
        >
          {icon}
        </div>
        {premium && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent-warm uppercase tracking-wider">
            <Crown className="w-2.5 h-2.5" />
            Premium
          </span>
        )}
      </div>
      <h3 className="font-serif text-lg font-semibold text-ink mb-1.5 leading-tight">
        {title}
      </h3>
      <p className="text-sm text-ink-muted leading-relaxed flex-1 mb-4">
        {body}
      </p>
      {action.external ? (
        <a
          href={action.href}
          className={`text-sm font-medium inline-flex items-center gap-1 ${
            premium ? "text-accent-warm hover:underline" : "text-primary hover:underline"
          }`}
        >
          {action.label} →
        </a>
      ) : (
        <Link
          href={action.href}
          className={`text-sm font-medium inline-flex items-center gap-1 ${
            premium ? "text-accent-warm hover:underline" : "text-primary hover:underline"
          }`}
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}
