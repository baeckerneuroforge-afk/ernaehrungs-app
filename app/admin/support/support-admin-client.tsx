"use client";

import { useState, useMemo } from "react";
import { LifeBuoy, Mail, User, CheckCircle, Clock, ArrowLeft, Loader2 } from "lucide-react";

interface Ticket {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "closed";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

type Filter = "open" | "in_progress" | "closed" | "all";

const STATUS_LABELS: Record<Ticket["status"], string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  closed: "Geschlossen",
};

const STATUS_STYLES: Record<Ticket["status"], string> = {
  open: "bg-orange-100 text-orange-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  closed: "bg-green-100 text-green-700",
};

export function SupportAdminClient({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [filter, setFilter] = useState<Filter>("open");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const active = useMemo(
    () => tickets.find((t) => t.id === activeId) || null,
    [tickets, activeId]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return tickets;
    return tickets.filter((t) => t.status === filter);
  }, [tickets, filter]);

  async function updateStatus(id: string, status: Ticket["status"]) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t))
        );
      }
    } finally {
      setUpdating(false);
    }
  }

  // Detail view
  if (active) {
    return (
      <div className="max-w-3xl">
        <button
          onClick={() => setActiveId(null)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-5 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Liste
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[active.status]}`}>
                  {STATUS_LABELS[active.status]}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(active.created_at).toLocaleString("de-DE")}
                </span>
              </div>
              <h1 className="text-xl font-semibold text-gray-800">{active.subject}</h1>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-600 mb-5 pb-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span>{active.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <a
                href={`mailto:${active.email}?subject=Re: ${encodeURIComponent(active.subject)}`}
                className="text-primary hover:underline"
              >
                {active.email}
              </a>
            </div>
          </div>

          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-6">
            {active.message}
          </p>

          <div className="flex flex-wrap gap-2">
            {active.status !== "in_progress" && (
              <button
                onClick={() => updateStatus(active.id, "in_progress")}
                disabled={updating}
                className="inline-flex items-center gap-1.5 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                In Bearbeitung
              </button>
            )}
            {active.status !== "closed" && (
              <button
                onClick={() => updateStatus(active.id, "closed")}
                disabled={updating}
                className="inline-flex items-center gap-1.5 bg-primary text-white hover:bg-primary-hover rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Als bearbeitet markieren
              </button>
            )}
            {active.status === "closed" && (
              <button
                onClick={() => updateStatus(active.id, "open")}
                disabled={updating}
                className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50"
              >
                Wieder öffnen
              </button>
            )}
            {updating && <Loader2 className="w-4 h-4 animate-spin text-gray-400 self-center" />}
          </div>
        </div>
      </div>
    );
  }

  // List view
  const filters: { key: Filter; label: string }[] = [
    { key: "open", label: "Offen" },
    { key: "in_progress", label: "In Bearbeitung" },
    { key: "closed", label: "Geschlossen" },
    { key: "all", label: "Alle" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <LifeBuoy className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-gray-800">Support-Tickets</h1>
      </div>

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-sm px-4 py-1.5 rounded-full transition ${
              filter === f.key
                ? "bg-primary text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:text-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <LifeBuoy className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm">Keine Tickets in dieser Ansicht.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left font-medium px-4 py-3">Datum</th>
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3">Betreff</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className="border-t border-gray-100 hover:bg-primary-bg/40 cursor-pointer transition"
                >
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(t.created_at).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{t.name}</td>
                  <td className="px-4 py-3 text-gray-700 truncate max-w-xs">{t.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
