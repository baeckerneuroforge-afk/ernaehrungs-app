import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { HilfeContent } from "@/components/hilfe/hilfe-content";

export const metadata = {
  title: "Hilfe – Nutriva-AI",
  description:
    "Tutorial und vollständige Feature-Übersicht zu Nutriva-AI: Erste Schritte, alle Funktionen der Pakete Kostenlos, Basis und Premium, FAQ und Support.",
};

export default function HilfePage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1">
        <HilfeContent />
      </main>
      <Footer />
    </div>
  );
}
