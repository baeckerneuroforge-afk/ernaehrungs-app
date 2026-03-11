"use client";

import { useState, useRef } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function WochencheckClient() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function generateCheck() {
    if (loading) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setContent("");
    setGenerated(false);

    try {
      const res = await fetch("/api/tracker/wochencheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error("Fehler beim Laden");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Kein Stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") {
              setContent((prev) => prev + data.text);
            } else if (data.type === "done") {
              setGenerated(true);
            } else if (data.type === "error") {
              setContent("Es gab einen Fehler bei der Analyse. Bitte versuche es erneut.");
              setGenerated(true);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setContent("Es gab einen Fehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
      setGenerated(true);
    }
  }

  return (
    <div>
      {!content && !loading && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-bg flex items-center justify-center text-primary mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Dein persönlicher Wochencheck
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Basierend auf deinem Ernährungstagebuch, Gewichtsverlauf und Zielen
            analysiert die KI deine Woche und gibt dir konkrete Tipps.
          </p>
          <button
            onClick={generateCheck}
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-primary-light transition"
          >
            <Sparkles className="w-4 h-4" />
            Wochencheck starten
          </button>
        </div>
      )}

      {(content || loading) && (
        <div>
          <div className="prose prose-sm max-w-none text-gray-700 [&_h3]:text-gray-800 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_ul]:mt-1 [&_li]:text-sm">
            <ReactMarkdown>{content}</ReactMarkdown>
            {loading && (
              <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse rounded-sm ml-0.5" />
            )}
          </div>

          {generated && (
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Basierend auf deinen Daten der letzten 7 Tage
              </p>
              <button
                onClick={generateCheck}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-light transition disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Neu generieren
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
