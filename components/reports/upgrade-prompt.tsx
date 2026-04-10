import Link from "next/link";
import { Sparkles, Lock } from "lucide-react";

export function UpgradePrompt() {
  return (
    <div className="bg-white rounded-3xl border border-border shadow-card p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-primary-faint flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-primary" />
      </div>
      <h2 className="font-serif text-xl text-ink mb-2">
        Monatsreport ist im Premium-Plan
      </h2>
      <p className="text-sm text-ink-muted max-w-md mx-auto mb-6">
        Jeden Monat bekommst du eine persönliche KI-Analyse deines
        Gewichtsverlaufs, deiner Ernährungsgewohnheiten und konkrete
        Empfehlungen für den nächsten Monat.
      </p>
      <Link
        href="/billing"
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-6 py-3 rounded-full shadow-card transition"
      >
        <Sparkles className="w-4 h-4" />
        Premium freischalten
      </Link>
    </div>
  );
}
