"use client";

import { useState } from "react";
import { Download, Trash2, Loader2 } from "lucide-react";

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
      if (res.status === 429) {
        const json = await res.json().catch(() => ({}));
        alert(
          json.message ||
            "Du kannst deine Daten nur einmal pro Stunde exportieren."
        );
        return;
      }
      if (!res.ok) throw new Error("Export fehlgeschlagen");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nutriva-datenexport-${new Date()
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
    <section className="bg-red-50/50 border border-red-200 rounded-2xl p-5 space-y-6">
      {/* Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-serif text-base text-red-700">
            Meine Daten herunterladen
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Datenübertragbarkeit gemäß Art. 20 DSGVO – alle deine Daten als
            JSON.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-white border border-red-200 text-red-700 hover:bg-red-50 transition disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exporting ? "Exportiere…" : "Herunterladen"}
        </button>
      </div>

      {/* Delete */}
      <div className="pt-5 border-t border-red-200">
        {!deleteOpen ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-serif text-base text-red-700">
                Account und alle Daten löschen
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Unwiderruflich. Alle Profil-, Chat- und Ernährungsdaten werden
                gelöscht.
              </p>
            </div>
            <button
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition"
            >
              <Trash2 className="w-4 h-4" />
              Account löschen
            </button>
          </div>
        ) : (
          <div className="bg-white border border-red-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm text-red-700 font-medium">
              Alle Daten werden unwiderruflich gelöscht.
            </p>
            <p className="text-xs text-ink-muted">
              Tippe <strong>LÖSCHEN</strong> um zu bestätigen.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
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
                className="flex-1 text-sm px-4 py-2 rounded-full bg-white border border-red-200 text-red-700 hover:bg-red-50 transition disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== "LÖSCHEN" || deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
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
    </section>
  );
}
