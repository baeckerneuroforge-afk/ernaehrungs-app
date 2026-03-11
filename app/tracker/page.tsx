import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";
import { Scale, Target, UtensilsCrossed, Calculator, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tracker</h1>
        <p className="text-gray-500 text-sm mb-8">
          Verfolge deinen Fortschritt und bleib motiviert.
        </p>

        {/* Wochencheck – prominent highlight card */}
        <Link
          href="/tracker/wochencheck"
          className="block bg-gradient-to-br from-primary to-primary-light rounded-2xl p-6 hover:shadow-lg transition group mb-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Wochencheck</h3>
              <p className="text-sm text-white/80">
                Dein persönlicher Wochenrückblick – basierend auf deinem Tagebuch,
                Gewichtsverlauf und Zielen. Mit konkreten Tipps für nächste Woche.
              </p>
            </div>
          </div>
        </Link>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/tracker/gewicht"
            className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:border-primary-bg transition group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center text-primary mb-4">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Gewicht</h3>
            <p className="text-sm text-gray-500">
              Trage dein Gewicht ein und sieh deinen Verlauf im Diagramm.
            </p>
          </Link>

          <Link
            href="/tracker/ziele"
            className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:border-primary-bg transition group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center text-primary mb-4">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Ziele</h3>
            <p className="text-sm text-gray-500">
              Setze dir Ziele und verfolge deinen Fortschritt.
            </p>
          </Link>

          <Link
            href="/tagebuch"
            className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:border-primary-bg transition group"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 mb-4">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Ernährungstagebuch</h3>
            <p className="text-sm text-gray-500">
              Halte fest, was du isst – für einen besseren Überblick.
            </p>
          </Link>

          <Link
            href="/tools/kalorienrechner"
            className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:border-primary-bg transition group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 mb-4">
              <Calculator className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Kalorienrechner</h3>
            <p className="text-sm text-gray-500">
              Berechne deinen täglichen Kalorienbedarf.
            </p>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
