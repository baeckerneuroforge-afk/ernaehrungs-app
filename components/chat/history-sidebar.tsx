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

  useEffect(() => {
    fetch("/api/chat/sessions")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setSessions(data); setLoading(false); });
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
        w-72 flex-shrink-0
        bg-white border-r border-gray-100
        flex flex-col
        transition-transform duration-200 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>

        {/* Brand header */}
        <div className="px-4 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800 text-sm">Ernährungsberatung</span>
            <button onClick={onClose} className="ml-auto p-1 text-gray-400 hover:text-gray-600 md:hidden">
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-primary hover:bg-primary-light px-3 py-2.5 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            Neuer Chat
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
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
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition group ${
                      isActive
                        ? "bg-primary-bg"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <p className={`text-sm truncate leading-snug ${isActive ? "text-primary font-medium" : "text-gray-700"}`}>
                      {session.title ? session.title.slice(0, 42) : "Neues Gespräch"}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
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
        </div>
      </div>
    </>
  );
}
