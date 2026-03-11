"use client";

import { useState, useEffect } from "react";
import { Loader2, MessageCircle, CheckCheck, Clock, Send, ChevronDown, ChevronUp } from "lucide-react";

interface AdminMessage {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  admin_reply: string | null;
  replied_at: string | null;
  is_read: boolean;
  created_at: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageCard({ msg, onReply }: { msg: AdminMessage; onReply: (id: string, reply: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState(!msg.is_read || !msg.admin_reply);
  const [replyText, setReplyText] = useState(msg.admin_reply || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSend() {
    if (!replyText.trim() || saving) return;
    setSaving(true);
    await onReply(msg.id, replyText);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all ${
      !msg.is_read ? "border-primary/30 shadow-sm" : "border-gray-100"
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/50 transition"
      >
        <div className="w-9 h-9 rounded-full bg-primary-bg flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-primary">
            {msg.user_name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-800">{msg.user_name}</p>
            {!msg.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            )}
            {msg.admin_reply && (
              <span className="inline-flex items-center gap-1 text-[10px] text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">
                <CheckCheck className="w-2.5 h-2.5" />
                Beantwortet
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{msg.content}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 py-4 space-y-4 bg-gray-50/30">
          {/* User message */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">
              Nachricht von {msg.user_name}
            </p>
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
              <p className="text-xs text-gray-400 mt-2">{formatDate(msg.created_at)}</p>
            </div>
          </div>

          {/* Reply area */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">
              {msg.admin_reply ? "Deine Antwort (bearbeiten)" : "Antworten"}
            </p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Antwort an ${msg.user_name}...`}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none bg-white"
            />
            <div className="flex items-center justify-between mt-2">
              {saved ? (
                <span className="flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCheck className="w-3.5 h-3.5" />
                  Antwort gesendet
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  {msg.admin_reply ? `Zuletzt beantwortet: ${msg.replied_at ? formatDate(msg.replied_at) : "—"}` : "Noch keine Antwort"}
                </span>
              )}
              <button
                onClick={handleSend}
                disabled={!replyText.trim() || saving}
                className="flex items-center gap-1.5 bg-primary text-white text-sm px-4 py-2 rounded-xl hover:bg-primary-light transition disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {msg.admin_reply ? "Aktualisieren" : "Senden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminNachrichtenPage() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/nachrichten")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setMessages(data);
        setLoading(false);
      });
  }, []);

  async function handleReply(id: string, reply: string) {
    const res = await fetch("/api/admin/nachrichten", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reply }),
    });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, admin_reply: reply, replied_at: new Date().toISOString(), is_read: true }
            : m
        )
      );
    }
  }

  const unread = messages.filter((m) => !m.is_read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-800">Nachrichten</h1>
        {unread > 0 && (
          <span className="bg-primary text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {unread} neu
          </span>
        )}
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Direkte Nachrichten deiner Nutzer – beantworte sie persönlich.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Gesamt</p>
          <p className="text-2xl font-bold text-gray-800">{messages.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Unbeantwortet</p>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <p className="text-2xl font-bold text-gray-800">
              {messages.filter((m) => !m.admin_reply).length}
            </p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Beantwortet</p>
          <div className="flex items-center gap-1.5">
            <CheckCheck className="w-4 h-4 text-green-600" />
            <p className="text-2xl font-bold text-gray-800">
              {messages.filter((m) => m.admin_reply).length}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">Noch keine Nachrichten.</p>
          <p className="text-xs text-gray-300 mt-1">
            Nutzer können dir über den Chat schreiben.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <MessageCard key={msg.id} msg={msg} onReply={handleReply} />
          ))}
        </div>
      )}
    </div>
  );
}
