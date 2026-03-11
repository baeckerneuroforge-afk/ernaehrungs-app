"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ChatMessage } from "@/components/chat/message";
import { MealPlan } from "@/types";
import {
  UtensilsCrossed,
  Plus,
  Loader2,
  FileText,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";

export default function ErnaehrungsplanPage() {
  const [plans, setPlans] = useState<
    Pick<MealPlan, "id" | "titel" | "zeitraum" | "created_at">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form
  const [zeitraum, setZeitraum] = useState("7 Tage");
  const [zusatzwunsch, setZusatzwunsch] = useState("");
  const streamRef = useRef<string>("");

  const loadPlans = useCallback(async () => {
    const res = await fetch("/api/ernaehrungsplan");
    if (res.ok) setPlans(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setStreamContent("");
    streamRef.current = "";

    try {
      const res = await fetch("/api/ernaehrungsplan/generieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zeitraum, zusatzwunsch: zusatzwunsch || null }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = JSON.parse(line.slice(6));
          if (data.type === "text") {
            streamRef.current += data.text;
            setStreamContent(streamRef.current);
          }
          if (data.type === "done") {
            loadPlans();
          }
        }
      }
    } catch (err) {
      console.error("Generation error:", err);
    } finally {
      setGenerating(false);
      setShowForm(false);
      setZusatzwunsch("");
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/ernaehrungsplan/${id}`, { method: "DELETE" });
    setDeleting(null);
    loadPlans();
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Ernährungsplan
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Lass dir einen individuellen Plan erstellen, basierend auf deinem
              Profil.
            </p>
          </div>
          {!generating && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition"
            >
              {showForm ? (
                <X className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {showForm ? "Abbrechen" : "Neuer Plan"}
            </button>
          )}
        </div>

        {/* Generate Form */}
        {showForm && !generating && (
          <form
            onSubmit={handleGenerate}
            className="bg-white rounded-2xl border border-gray-100 p-5 mb-6"
          >
            <h3 className="font-semibold text-gray-800 text-sm mb-3">
              Plan erstellen
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Zeitraum
                </label>
                <div className="flex gap-2">
                  {["1 Tag", "3 Tage", "7 Tage"].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setZeitraum(z)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        zeitraum === z
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {z}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Zusätzliche Wünsche (optional)
                </label>
                <input
                  type="text"
                  value={zusatzwunsch}
                  onChange={(e) => setZusatzwunsch(e.target.value)}
                  placeholder="z.B. Viel Protein, wenig Aufwand, Budget-freundlich..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition"
            >
              <UtensilsCrossed className="w-4 h-4" />
              Plan generieren
            </button>
          </form>
        )}

        {/* Streaming Output */}
        {(generating || streamContent) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              {generating && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
              <h3 className="font-semibold text-gray-800 text-sm">
                {generating
                  ? "Plan wird erstellt..."
                  : "Dein neuer Ernährungsplan"}
              </h3>
            </div>
            <ChatMessage content={streamContent} isStreaming={generating} />
            {!generating && streamContent && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    setStreamContent("");
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition"
                >
                  Vorschau schließen
                </button>
              </div>
            )}
          </div>
        )}

        {/* Saved Plans */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">
            Gespeicherte Pläne ({plans.length})
          </h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Noch keine Pläne erstellt.</p>
              <p className="text-xs mt-1">
                Erstelle deinen ersten Ernährungsplan.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between px-4 py-3 bg-surface-muted rounded-xl"
                >
                  <Link
                    href={`/ernaehrungsplan/${plan.id}`}
                    className="flex items-center gap-3 flex-1 hover:text-primary transition"
                  >
                    <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {plan.titel}
                      </p>
                      <p className="text-xs text-gray-400">
                        {plan.zeitraum} ·{" "}
                        {new Date(plan.created_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    disabled={deleting === plan.id}
                    className="text-gray-400 hover:text-red-500 transition p-1"
                  >
                    {deleting === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
