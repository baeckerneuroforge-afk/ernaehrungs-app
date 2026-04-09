import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";
import { Scale, Target, BookOpen, Calculator, Sparkles, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const cards = [
  {
    href: "/tracker/gewicht",
    icon: Scale,
    title: "Gewicht",
    description: "Trage dein Gewicht ein und sieh deinen Verlauf im Diagramm.",
  },
  {
    href: "/tracker/ziele",
    icon: Target,
    title: "Ziele",
    description: "Setze dir Ziele und verfolge deinen Fortschritt.",
  },
  {
    href: "/tagebuch",
    icon: BookOpen,
    title: "Tagebuch",
    description: "Halte fest, was du isst – für einen besseren Überblick.",
  },
  {
    href: "/tools/kalorienrechner",
    icon: Calculator,
    title: "Kalorienrechner",
    description: "Berechne deinen täglichen Kalorienbedarf.",
  },
];

export default async function TrackerPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full animate-fade-in">
        <h1 className="font-serif text-3xl text-ink mb-2">Tracker</h1>
        <p className="text-ink-muted text-sm mb-8">
          Verfolge deinen Fortschritt und bleib motiviert.
        </p>

        {/* Wochencheck – featured gradient card */}
        <Link
          href="/tracker/wochencheck"
          className="block bg-gradient-to-br from-primary to-primary-hover text-white rounded-2xl p-6 shadow-card hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 mb-6 group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl text-white mb-1">Wochencheck</h3>
                <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-sm text-white/85 leading-relaxed">
                Dein persönlicher Wochenrückblick – basierend auf deinem Tagebuch,
                Gewichtsverlauf und Zielen. Mit konkreten Tipps für nächste Woche.
              </p>
            </div>
          </div>
        </Link>

        <div className="grid sm:grid-cols-2 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="bg-white rounded-2xl border border-border p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center text-primary mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg text-ink mb-1">{card.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
