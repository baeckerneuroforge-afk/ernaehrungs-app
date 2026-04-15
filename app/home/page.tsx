"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";
import {
  Scale,
  Flame,
  Zap,
  CalendarDays,
  MessageCircle,
  BookOpen,
  ClipboardList,
  Calculator,
  Loader2,
  TrendingDown,
  Target,
  Upload,
} from "lucide-react";

interface Activity {
  type: string;
  title: string;
  subtitle?: string;
  time: string;
  link: string;
}

interface HomeData {
  name: string | null;
  todayCalories: number;
  currentWeight: number | null;
  weightTrend: number | null;
  credits: number;
  plan: string;
  calorieTarget: number | null;
  weekEntries: number;
  gewichtsZiel: {
    zielwert?: number;
    startwert?: number;
    zieldatum?: string;
    beschreibung?: string;
  } | null;
  progressPercent: number;
  remainingKg: number;
  activities: Activity[];
}

const QUOTES = [
  "Ernährung ist kein Sprint, sondern ein Marathon.",
  "Jeder kleine Schritt zählt — auch der Joghurt statt dem Schokoriegel.",
  "Perfekt gibt es nicht. Gut genug ist perfekt.",
  "Dein Körper ist dein Zuhause — behandle ihn wie eins.",
  "Nicht die Diät verändert dich, sondern das Verständnis.",
  "Geduld mit dir selbst ist das stärkste Werkzeug.",
  "Ein guter Tag beginnt mit einer bewussten Entscheidung.",
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "Guten Morgen";
  if (h >= 11 && h < 14) return "Mahlzeit";
  if (h >= 14 && h < 18) return "Guten Nachmittag";
  if (h >= 18 && h < 23) return "Guten Abend";
  return "Noch wach?";
}

function getDailyQuote(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return QUOTES[dayOfYear % QUOTES.length];
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} Tag${days === 1 ? "" : "en"}`;
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

const ACTIVITY_STYLES: Record<string, { icon: typeof MessageCircle; bg: string; text: string }> = {
  chat: { icon: MessageCircle, bg: "bg-primary-pale", text: "text-primary" },
  food: { icon: BookOpen, bg: "bg-orange-100", text: "text-orange-600" },
  weight: { icon: Scale, bg: "bg-blue-100", text: "text-blue-600" },
  plan: { icon: ClipboardList, bg: "bg-indigo-100", text: "text-indigo-600" },
};

const PLAN_LABELS: Record<string, string> = {
  free: "Kostenlos",
  pro: "Basis",
  pro_plus: "Premium",
  admin: "Admin",
};

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/home")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-bg">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-bg">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 w-full text-center">
          <p className="text-ink-muted">Daten konnten nicht geladen werden.</p>
          <Link href="/chat" className="text-primary hover:underline text-sm mt-2 inline-block">
            Zum Chat →
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const vorname = data.name?.split(" ")[0] || "dort";
  const greeting = getGreeting();
  const quote = getDailyQuote();

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6 animate-fade-in">
        {/* 1. Greeting */}
        <div>
          <h1 className="font-serif text-2xl text-ink">
            Hallo {vorname}
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {greeting} — hier ist dein Überblick.
          </p>
        </div>

        {/* 2. Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Scale className="w-4 h-4" />}
            label="Gewicht"
            value={data.currentWeight ? `${data.currentWeight}` : "—"}
            unit="kg"
            sub={
              data.weightTrend != null
                ? `${data.weightTrend > 0 ? "+" : ""}${data.weightTrend} kg / Woche`
                : undefined
            }
            subColor={
              data.weightTrend != null
                ? data.weightTrend < 0
                  ? "text-primary"
                  : data.weightTrend > 0
                    ? "text-amber-600"
                    : "text-ink-faint"
                : undefined
            }
          />
          <StatCard
            icon={<Flame className="w-4 h-4" />}
            label="Heute"
            value={`${data.todayCalories}`}
            unit="kcal"
            sub={
              data.calorieTarget
                ? `von ${data.calorieTarget} kcal`
                : undefined
            }
          />
          <StatCard
            icon={<Zap className="w-4 h-4" />}
            label="Credits"
            value={data.credits < 0 ? "∞" : `${data.credits}`}
            sub={PLAN_LABELS[data.plan] || data.plan}
          />
          <StatCard
            icon={<CalendarDays className="w-4 h-4" />}
            label="Tagebuch"
            value={`${data.weekEntries}`}
            unit="Einträge"
            sub="diese Woche"
          />
        </div>

        {/* 3. Goal Progress */}
        {data.gewichtsZiel?.zielwert && data.currentWeight && (
          <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Dein Ziel
              </h3>
              <span className="text-xs text-ink-faint">
                {data.gewichtsZiel.startwert || data.currentWeight} kg → {data.gewichtsZiel.zielwert} kg
              </span>
            </div>
            <div className="w-full bg-surface-muted rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary rounded-full h-3 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, data.progressPercent))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-ink-muted">
              <span className="flex items-center gap-1">
                {data.progressPercent > 0 ? (
                  <TrendingDown className="w-3 h-3 text-primary" />
                ) : null}
                {data.progressPercent}% geschafft
              </span>
              <span>noch {data.remainingKg} kg</span>
            </div>
            {data.gewichtsZiel.zieldatum && (
              <p className="text-xs text-ink-faint">
                Zieldatum: {new Date(data.gewichtsZiel.zieldatum).toLocaleDateString("de-DE")}
              </p>
            )}
          </div>
        )}

        {/* 4. Quick Actions */}
        <div className="space-y-2">
          <h3 className="font-semibold text-xs text-ink-faint uppercase tracking-wide">
            Was möchtest du tun?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction href="/chat" icon={MessageCircle} label="Chat starten" sub="Frag mich was" />
            <QuickAction href="/tagebuch" icon={BookOpen} label="Mahlzeit eintragen" sub="Tagebuch öffnen" />
            <QuickAction href="/ernaehrungsplan" icon={ClipboardList} label="Ernährungsplan" sub="Plan erstellen" />
            <QuickAction href="/tools/kalorienrechner" icon={Calculator} label="Kalorienrechner" sub="Bedarf berechnen" />
          </div>
        </div>

        {/* 4b. Import hint for premium */}
        {(data.plan === "pro_plus" || data.plan === "admin") && (
          <Link
            href="/einstellungen/import"
            className="flex items-center gap-3 bg-white rounded-2xl border border-border shadow-card p-4 hover:border-primary/30 transition-all duration-200"
          >
            <div className="w-9 h-9 rounded-xl bg-primary-pale flex items-center justify-center flex-shrink-0">
              <Upload className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink">Daten importieren</p>
              <p className="text-[11px] text-ink-faint">MyFitnessPal, Yazio, Lifesum, FDDB & mehr</p>
            </div>
            <span className="text-xs text-primary font-medium flex-shrink-0">CSV Import →</span>
          </Link>
        )}

        {/* 5. Recent Activity */}
        {data.activities.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-xs text-ink-faint uppercase tracking-wide">
              Letzte Aktivität
            </h3>
            <div className="space-y-2">
              {data.activities.map((item, i) => {
                const style = ACTIVITY_STYLES[item.type] || ACTIVITY_STYLES.chat;
                const Icon = style.icon;
                return (
                  <Link
                    key={i}
                    href={item.link}
                    className="flex items-center gap-3 bg-white rounded-xl p-3 border border-border hover:border-primary/30 transition-all duration-200 shadow-card"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                      <Icon className={`w-4 h-4 ${style.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-ink-faint">{item.subtitle}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-ink-faint whitespace-nowrap flex-shrink-0">
                      {relativeTime(item.time)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Motivation */}
        <div className="bg-primary-faint rounded-2xl border border-primary-pale p-5 text-center">
          <p className="text-sm italic text-ink leading-relaxed">
            &ldquo;{quote}&rdquo;
          </p>
          <p className="text-xs text-ink-faint mt-1.5">— Janine</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  sub,
  subColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-4">
      <div className="flex items-center gap-1.5 text-ink-faint text-[10px] uppercase tracking-wide mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-xl font-bold text-ink leading-none">
        {value}
        {unit && <span className="text-sm font-normal text-ink-faint ml-1">{unit}</span>}
      </p>
      {sub && (
        <p className={`text-[11px] mt-1 ${subColor || "text-ink-faint"}`}>{sub}</p>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  sub,
}: {
  href: string;
  icon: typeof MessageCircle;
  label: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="bg-primary-faint hover:bg-primary-pale rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors text-center border border-primary-pale"
    >
      <Icon className="w-6 h-6 text-primary" />
      <span className="text-sm font-medium text-ink">{label}</span>
      <span className="text-[10px] text-ink-faint">{sub}</span>
    </Link>
  );
}
