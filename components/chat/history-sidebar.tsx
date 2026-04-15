"use client";

import { useState, useEffect } from "react";
import { Plus, MessageSquare, Loader2, X, Leaf } from "lucide-react";
import type { ChatSession } from "@/types";

interface Props {
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  open: boolean;
  onClose: () => void;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} Tag${days === 1 ? "" : "en"}`;
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export function HistorySidebar({ currentSessionId, onSelectSession, onNewChat, open, onClose }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ plan?: string; sessionLimit?: number; daysLimit?: number | null } | null>(null);

  useEffect(() => {
    fetch("/api/chat/sessions")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        // Handle both old format (array) and new format ({ sessions, meta })
        if (Array.isArray(data)) {
          setSessions(data);
        } else {
          setSessions(data.sessions || []);
          setMeta(data.meta || null);
        }
        setLoading(false);
      });
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-50 md:z-auto
        top-0 left-0 h-full
        w-[280px] flex-shrink-0
        bg-white border-r border-border
        flex flex-col
        transition-transform duration-300 ease-out
        ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>

        {/* Brand header */}
        <div className="px-4 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-card">
              <Leaf className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="font-serif font-semibold text-ink text-[15px]">Gespräche</span>
            <button onClick={onClose} className="ml-auto p-1.5 rounded-full text-ink-faint hover:text-ink hover:bg-surface-muted md:hidden transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover px-4 py-2.5 rounded-full transition-all duration-200 shadow-card"
          >
            <Plus className="w-4 h-4" />
            Neues Gespräch
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-4 h-4 animate-spin text-ink-faint" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-11 h-11 rounded-2xl bg-primary-faint flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5 text-primary/60" />
              </div>
              <p className="text-xs text-ink-faint leading-relaxed">
                Noch keine Gespräche.<br />Starte deinen ersten Chat!
              </p>
            </div>
          ) : (
            <div className="px-2 space-y-0.5">
              {sessions.map((session) => {
                const isActive = session.session_id === currentSessionId;
                return (
                  <button
                    key={session.session_id}
                    onClick={() => { onSelectSession(session.session_id); onClose(); }}
                    className={`w-full text-left pl-3 pr-3 py-2.5 rounded-xl transition-all duration-200 border-l-2 ${
                      isActive
                        ? "bg-primary-pale border-primary"
                        : "border-transparent hover:bg-surface-muted"
                    }`}
                  >
                    <p className={`text-sm truncate leading-snug ${isActive ? "text-primary font-medium" : "text-ink"}`}>
                      {session.title ? session.title.slice(0, 42) : "Neues Gespräch"}
                    </p>
                    <p className="text-[10px] text-ink-faint mt-0.5">
                      {relativeTime(session.last_message_at)}
                      {session.message_count > 0 && (
                        <span className="ml-1">· {session.message_count} Nachr.</span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
          {!loading && meta && meta.daysLimit && sessions.length > 0 && (
            <div className="px-3 py-3 mt-1 border-t border-border">
              <p className="text-[10px] text-ink-faint leading-relaxed">
                {meta.plan === "free"
                  ? "Du siehst deine letzten 5 Chats (30 Tage). Mit Basis: 20 Chats (90 Tage). Mit Premium: unbegrenzt."
                  : "Du siehst deine letzten 20 Chats (90 Tage). Mit Premium: unbegrenzt."}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
