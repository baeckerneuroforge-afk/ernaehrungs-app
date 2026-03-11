"use client";

import { useState } from "react";
import { X, BookOpen, Loader2, Check } from "lucide-react";

interface Props {
  questionText: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AufnehmenDialog({ questionText, onClose, onSuccess }: Props) {
  const [antwort, setAntwort] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!antwort.trim()) return;
    setSaving(true);

    const res = await fetch("/api/admin/fragen/aufnehmen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_text: questionText,
        answer_text: antwort.trim(),
      }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-gray-800">
            In Wissensbasis aufnehmen
          </h2>
        </div>

        {/* Question */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-400 mb-1">Nutzerfrage:</p>
          <p className="text-sm text-gray-700">{questionText}</p>
        </div>

        {/* Answer input */}
        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">
            Deine Antwort / Artikel
          </label>
          <textarea
            value={antwort}
            onChange={(e) => setAntwort(e.target.value)}
            rows={6}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            placeholder="Schreibe hier die fachlich korrekte Antwort oder einen Artikel zu diesem Thema..."
            disabled={saving || saved}
          />
          <p className="text-xs text-gray-400 mt-1">
            Der Text wird automatisch in die Wissensbasis eingebettet und steht
            dem Chat-Bot sofort zur Verfügung.
          </p>
        </div>

        {/* Actions */}
        {saved ? (
          <div className="flex items-center gap-2 text-primary text-sm">
            <Check className="w-4 h-4" />
            Erfolgreich in die Wissensbasis aufgenommen!
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 text-sm text-gray-500 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={!antwort.trim() || saving}
              className="flex-1 text-sm text-white bg-primary py-2.5 rounded-lg hover:bg-primary-light transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BookOpen className="w-4 h-4" />
              )}
              Aufnehmen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
