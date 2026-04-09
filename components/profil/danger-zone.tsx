"use client";

import { useState } from "react";
import { Download, Trash2, Loader2, AlertTriangle } from "lucide-react";

export function DangerZone() {
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/user/export");
      if (!res.ok) throw new Error("Export fehlgeschlagen");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ernaehrungsberatung-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Export fehlgeschlagen. Bitte versuche es später erneut.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/user/delete", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(json.error || "Löschung fehlgeschlagen.");
        setDeleting(false);
        return;
      }
      window.location.href = "/";
    } catch {
      setDeleteError("Netzwerkfehler. Bitte später erneut versuchen.");
      setDeleting(false);
    }
  }

  return (
    <section className="mt-12 border border-red-200 rounded-2xl overflow-hidden bg-red-50/30">
      <header className="px-5 py-4 bg-red-50 border-b border-red-200 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <h2 className="text-sm font-semibold text-red-700">Gefahrenbereich</h2>
      </header>

      <div className="p-5 space-y-6">
        {/* Export */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Meine Daten herunterladen
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Datenübertragbarkeit gemäß Art. 20 DSGVO – alle deine Daten als
              JSON.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? "Exportiere…" : "Meine Daten herunterladen"}
          </button>
        </div>

        {/* Delete */}
        <div className="pt-5 border-t border-red-100">
          {!deleteOpen ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-red-700">
                  Account und alle Daten löschen
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Unwiderruflich. Alle Profil-, Chat- und Ernährungsdaten werden
                  gelöscht.
                </p>
              </div>
              <button
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition"
              >
                <Trash2 className="w-4 h-4" />
                Account und alle Daten löschen
              </button>
            </div>
          ) : (
            <div className="bg-white border border-red-200 rounded-xl p-4 space-y-3">
              <p className="text-sm text-red-700 font-medium">
                Alle Daten werden unwiderruflich gelöscht.
              </p>
              <p className="text-xs text-gray-600">
                Tippe <strong>LÖSCHEN</strong> um zu bestätigen.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                placeholder="LÖSCHEN"
                autoFocus
              />
              {deleteError && (
                <p className="text-xs text-red-600">{deleteError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setDeleteOpen(false);
                    setConfirmText("");
                    setDeleteError(null);
                  }}
                  disabled={deleting}
                  className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDelete}
                  disabled={confirmText !== "LÖSCHEN" || deleting}
                  className="flex-1 inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Endgültig löschen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
