import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { UpgradeCard } from "@/components/upgrade-card";
import { getUserPlan } from "@/lib/feature-gates-server";
import { hasFeatureAccess } from "@/lib/feature-gates";
import { ScanLine } from "lucide-react";
import dynamic from "next/dynamic";

// Load scanner client-only — html5-qrcode accesses DOM APIs that crash during SSR
const ScannerClient = dynamic(
  () => import("@/components/scanner/scanner-client"),
  { ssr: false, loading: () => <ScannerLoading /> }
);

function ScannerLoading() {
  return (
    <div className="text-center py-10">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-sm text-ink-muted mt-3">Scanner wird geladen...</p>
    </div>
  );
}

export default async function ScannerPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const plan = await getUserPlan(userId);
  const isPremium = hasFeatureAccess(plan, "barcode_scanner");

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-lg mx-auto px-4 sm:px-6 py-10 w-full">
        <h1 className="font-serif text-2xl text-ink mb-1">Barcode-Scanner</h1>
        <p className="text-ink-muted text-sm mb-6">
          {isPremium
            ? "Scanne den Barcode eines Lebensmittels — Nährwerte werden automatisch erkannt."
            : "Scanne Lebensmittel und erfasse Nährwerte automatisch."}
        </p>

        {isPremium ? (
          <ScannerClient />
        ) : (
          <UpgradeCard
            icon={ScanLine}
            title="Barcode-Scanner"
            description="Scanne den Barcode eines Lebensmittels — Kalorien, Protein, Kohlenhydrate und Fett werden automatisch erkannt und ins Tagebuch eingetragen."
            features={[
              "Barcode scannen mit der Kamera",
              "Nährwerte aus 3 Mio.+ Produkten",
              "Direkt ins Tagebuch eintragen",
            ]}
            ctaLabel="Premium wählen — mit Scanner"
            ctaHref="/#preise"
            requiredPlan="pro_plus"
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
