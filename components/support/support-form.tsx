"use client";

import { useState } from "react";
import { Send, Check, Loader2 } from "lucide-react";

const SUBJECTS = [
  "Technisches Problem",
  "Frage zur App",
  "Abo & Zahlung",
  "Datenschutz",
  "Feedback",
  "Sonstiges",
] as const;

interface Props {
  prefillName?: string;
  prefillEmail?: string;
}

export function SupportForm({ prefillName = "", prefillEmail = "" }: Props) {
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (message.trim().length < 20) {
      setError("Bitte beschreibe dein Anliegen in mindestens 20 Zeichen.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Beim Senden ist ein Fehler aufgetreten.");
        return;
      }
      setSuccess(data.message);
      setMessage("");
    } catch {
      setError("Keine Verbindung zum Server.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm text-ink font-medium">Nachricht gesendet</p>
        <p className="text-xs text-ink-muted mt-1">{success}</p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
            placeholder="Dein Name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5">
            E-Mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
            placeholder="du@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1.5">
          Betreff
        </label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputClass}
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1.5">
          Nachricht
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={20}
          rows={6}
          className={`${inputClass} resize-none`}
          placeholder="Beschreibe dein Anliegen …"
        />
        <p className="text-xs text-ink-faint mt-1">
          Mindestens 20 Zeichen ({message.trim().length}/20)
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white rounded-full px-6 py-3 text-sm font-medium shadow-card transition-all duration-200 hover:-translate-y-0.5 disabled:translate-y-0"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Wird gesendet …
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Nachricht senden
          </>
        )}
      </button>
    </form>
  );
}
