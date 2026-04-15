import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { KalorienrechnerClient } from "@/components/tools/kalorienrechner-client";

export default async function KalorienrechnerPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = createSupabaseAdmin();

  const [{ data: profile }, { data: ziele }] = await Promise.all([
    supabase
      .from("ea_profiles")
      .select("alter_jahre, geschlecht, groesse_cm, gewicht_kg, aktivitaet, ziel, calorie_adjustment")
      .eq("user_id", userId)
      .limit(1),
    supabase
      .from("ea_ziele")
      .select("typ, beschreibung, zielwert, startwert, einheit, zieldatum, erreicht")
      .eq("user_id", userId)
      .eq("erreicht", false)
      .order("created_at", { ascending: false }),
  ]);

  const gewichtsZiel =
    ziele?.find(
      (z) =>
        z.typ === "gewicht" ||
        z.beschreibung?.toLowerCase().includes("abnehm") ||
        z.beschreibung?.toLowerCase().includes("zunahm") ||
        z.beschreibung?.toLowerCase().includes("muskel"),
    ) ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Kalorienrechner</h1>
        <p className="text-gray-500 text-sm mb-8">
          Berechne deinen täglichen Kalorienbedarf basierend auf deinem Profil.
        </p>
        <KalorienrechnerClient
          prefill={profile?.[0] ?? null}
          gewichtsZiel={gewichtsZiel}
        />
      </main>
      <Footer />
    </div>
  );
}
