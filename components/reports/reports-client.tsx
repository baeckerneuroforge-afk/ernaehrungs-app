"use client";

import { useState } from "react";
import {
  Calendar,
  Download,
  TrendingUp,
  UtensilsCrossed,
  Target,
  Lightbulb,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyReportData } from "@/lib/monthly-report";

type ReportRow = {
  id: string;
  month: string; // YYYY-MM
  report_data: MonthlyReportData;
  created_at: string;
};

const MONTH_LABELS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTH_LABELS[m - 1]} ${y}`;
}

export function ReportsClient({ reports }: { reports: ReportRow[] }) {
  const [selected, setSelected] = useState<ReportRow | null>(null);

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-border shadow-card p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-primary-faint flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-6 h-6 text-primary" />
        </div>
        <h2 className="font-serif text-xl text-ink mb-2">
          Noch kein Report verfügbar
        </h2>
        <p className="text-sm text-ink-muted max-w-md mx-auto">
          Dein erster Monatsreport wird am 1. des kommenden Monats automatisch
          erstellt. Nutze bis dahin fleißig Tagebuch und Tracker — je mehr
          Daten, desto besser die Analyse.
        </p>
      </div>
    );
  }

  if (selected) {
    return <ReportDetail report={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {reports.map((r) => {
        const delta = r.report_data.stats?.weightDelta;
        return (
          <button
            key={r.id}
            onClick={() => setSelected(r)}
            className="text-left bg-white rounded-2xl border border-border shadow-card p-5 hover:border-primary/40 hover:shadow-card-hover transition"
          >
            <div className="flex items-center gap-2 text-xs text-ink-faint mb-2">
              <Calendar className="w-3.5 h-3.5" />
              {formatMonth(r.month)}
            </div>
            <h3 className="font-serif text-lg text-ink mb-2 line-clamp-2">
              {r.report_data.summary || "Monatsanalyse"}
            </h3>
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              {delta != null && (
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {delta > 0 ? "+" : ""}
                  {delta} kg
                </span>
              )}
              <span>{r.report_data.stats?.foodLogEntries ?? 0} Einträge</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ReportDetail({
  report,
  onBack,
}: {
  report: ReportRow;
  onBack: () => void;
}) {
  const { report_data: d, month } = report;

  async function handleDownloadPdf() {
    // Browser-native print → "Als PDF speichern" ist die pragmatischste
    // Lösung ohne zusätzliche Library. Wir öffnen eine druckbare Version.
    window.print();
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-primary transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>
        <button
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-full transition"
        >
          <Download className="w-4 h-4" />
          Als PDF speichern
        </button>
      </div>

      <header>
        <div className="flex items-center gap-2 text-xs text-ink-faint mb-1">
          <Calendar className="w-3.5 h-3.5" />
          {formatMonth(month)}
        </div>
        <h2 className="font-serif text-2xl text-ink">Dein Monatsreport</h2>
      </header>

      <Section icon={Sparkles} title="Zusammenfassung" tone="primary">
        <p className="text-[15px] text-ink leading-relaxed">{d.summary}</p>
      </Section>

      <Section icon={TrendingUp} title="Gewichtsentwicklung">
        {d.weightSeries && d.weightSeries.length > 1 ? (
          <div className="h-40 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={d.weightSeries}
                margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  domain={["auto", "auto"]}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke="var(--color-primary, #6C7F4A)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-ink-faint mb-3">
            Nicht genug Gewichtseinträge für eine Grafik.
          </p>
        )}
        <p className="text-sm text-ink leading-relaxed mt-3">
          {d.weightAnalysis}
        </p>
        {d.stats?.weightDelta != null && (
          <p className="text-xs text-ink-muted mt-2">
            Veränderung: {d.stats.weightDelta > 0 ? "+" : ""}
            {d.stats.weightDelta} kg ({d.stats.weightStart} kg →{" "}
            {d.stats.weightEnd} kg)
          </p>
        )}
      </Section>

      <Section icon={UtensilsCrossed} title="Ernährungsgewohnheiten">
        <p className="text-sm text-ink leading-relaxed">
          {d.nutritionAnalysis}
        </p>
        <div className="flex gap-4 mt-3 text-xs text-ink-muted">
          <span>{d.stats?.foodLogEntries ?? 0} Tagebucheinträge</span>
          {d.stats?.avgKcalPerDay != null && (
            <span>Ø {d.stats.avgKcalPerDay} kcal/Tag</span>
          )}
          <span>{d.stats?.plansCreated ?? 0} Pläne erstellt</span>
        </div>
      </Section>

      <Section icon={Target} title="Zielerreichung">
        <p className="text-sm text-ink leading-relaxed">{d.goalProgress}</p>
      </Section>

      <Section icon={Lightbulb} title="Empfehlungen für nächsten Monat">
        <ul className="space-y-2">
          {(d.recommendations || []).map((rec, i) => (
            <li
              key={i}
              className="text-sm text-ink leading-relaxed flex gap-2"
            >
              <span className="text-primary font-semibold shrink-0">
                {i + 1}.
              </span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: typeof Calendar;
  title: string;
  tone?: "primary";
  children: React.ReactNode;
}) {
  return (
    <section
      className={`bg-white rounded-3xl border shadow-card p-5 sm:p-6 ${
        tone === "primary" ? "border-primary/30" : "border-border"
      }`}
    >
      <h3 className="font-serif text-lg text-ink flex items-center gap-2 mb-3">
        <span
          className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
            tone === "primary"
              ? "bg-primary text-white"
              : "bg-primary-faint text-primary"
          }`}
        >
          <Icon className="w-4 h-4" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}
