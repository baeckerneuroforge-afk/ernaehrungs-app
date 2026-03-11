"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface DocumentGroup {
  source: string;
  chunks: number;
  created_at: string;
  ids: string[];
}

export default function WissensbasisPage() {
  const [documents, setDocuments] = useState<DocumentGroup[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    const res = await fetch("/api/documents");
    if (res.ok) {
      setDocuments(await res.json());
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadResult({
          type: "success",
          message: `"${data.fileName}" hochgeladen – ${data.inserted} Abschnitte erstellt.`,
        });
        loadDocuments();
      } else {
        setUploadResult({ type: "error", message: data.error });
      }
    } catch {
      setUploadResult({
        type: "error",
        message: "Upload fehlgeschlagen. Bitte versuche es erneut.",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(source: string) {
    if (!confirm(`"${source}" wirklich löschen?`)) return;
    setDeleting(source);

    await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });

    setDeleting(null);
    loadDocuments();
  }

  return (
    <div className="max-w-3xl">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Wissensbasis</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Lade Dokumente hoch die als Grundlage für die KI-Beratung dienen.
            Die KI antwortet nur basierend auf diesem Wissen.
          </p>
        </div>

        {/* Upload */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">
            Dokument hochladen
          </h3>
          <label
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition ${
              uploading
                ? "border-gray-200 bg-gray-50"
                : "border-primary-bg hover:border-primary-pale hover:bg-primary-bg/30"
            }`}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            ) : (
              <Upload className="w-8 h-8 text-primary mb-2" />
            )}
            <span className="text-sm text-gray-600 font-medium">
              {uploading
                ? "Wird verarbeitet..."
                : "Klicke oder ziehe eine Datei hierher"}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              .pdf, .docx, .txt oder .md Dateien
            </span>
            <input
              type="file"
              accept=".txt,.md,.pdf,.docx"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {uploadResult && (
            <div
              className={`mt-4 flex items-start gap-2 text-sm rounded-xl px-4 py-3 ${
                uploadResult.type === "success"
                  ? "bg-primary-bg text-primary"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {uploadResult.type === "success" ? (
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              {uploadResult.message}
            </div>
          )}
        </div>

        {/* Document List */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">
            Hochgeladene Dokumente ({documents.length})
          </h3>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">
                Noch keine Dokumente hochgeladen.
              </p>
              <p className="text-xs mt-1">
                Lade dein erstes Wissensdokument hoch um loszulegen.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.source}
                  className="flex items-center justify-between px-4 py-3 bg-surface-muted rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {doc.source}
                      </p>
                      <p className="text-xs text-gray-400">
                        {doc.chunks} Abschnitte ·{" "}
                        {new Date(doc.created_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.source)}
                    disabled={deleting === doc.source}
                    className="text-gray-400 hover:text-red-500 transition p-1"
                  >
                    {deleting === doc.source ? (
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
      </div>
    </div>
  );
}
