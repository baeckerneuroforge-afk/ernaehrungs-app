"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ChatMessage } from "@/components/chat/message";
import { MealPlan } from "@/types";
import {
  ArrowLeft,
  Printer,
  Loader2,
  Trash2,
  Calendar,
  User,
} from "lucide-react";
import Link from "next/link";

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ernaehrungsplan/${params.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setPlan(data);
        setLoading(false);
      });
  }, [params.id]);

  async function handleDelete() {
    if (!confirm("Plan wirklich löschen?")) return;
    await fetch(`/api/ernaehrungsplan/${params.id}`, { method: "DELETE" });
    router.push("/ernaehrungsplan");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-bg">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-bg">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Plan nicht gefunden.
        </div>
      </div>
    );
  }

  const snapshot = plan.profil_snapshot as Record<string, unknown> | null;

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full pb-bottom-nav">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/ernaehrungsplan"
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Zurück
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">{plan.titel}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                {new Date(plan.created_at).toLocaleDateString("de-DE")}
              </span>
              {plan.zeitraum && (
                <span className="text-xs text-gray-400">{plan.zeitraum}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm hover:border-primary hover:text-primary transition"
            >
              <Printer className="w-4 h-4" />
              Drucken
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-400 px-3 py-2 rounded-lg text-sm hover:border-red-300 hover:text-red-500 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Profile Snapshot */}
        {snapshot && Object.keys(snapshot).length > 0 && (
          <div className="bg-primary-bg/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary">
                Profil bei Erstellung
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(snapshot).map(([key, val]) => (
                <span
                  key={key}
                  className="text-xs bg-white px-2 py-1 rounded text-gray-500"
                >
                  {Array.isArray(val) ? val.join(", ") : String(val)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Plan Content */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 print:border-none print:shadow-none">
          <ChatMessage content={plan.inhalt || ""} />
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Dieser Plan ersetzt keine ärztliche Beratung.
        </p>
      </main>
      <Footer />
    </div>
  );
}
