"use client";

import { useState, useEffect } from "react";
import { X, Send, Loader2, MessageCircle, CheckCheck, Clock } from "lucide-react";

interface UserMessage {
  id: string;
  content: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

interface Props {
  onClose: () => void;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DirectMessagePanel({ onClose }: Props) {
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/messages")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setMessages(data);
        setLoading(false);
      });
  }, []);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    if (res.ok) {
      const newMsg: UserMessage = {
        id: crypto.randomUUID(),
        content: text.trim(),
        admin_reply: null,
        replied_at: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [newMsg, ...prev]);
      setText("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-full md:left-auto md:right-4 md:mb-2 md:w-96 z-50 bg-white rounded-t-2xl md:rounded-2xl border border-gray-100 shadow-xl flex flex-col max-h-[70vh] md:max-h-[500px]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary-bg flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Nachricht an Janine</p>
            <p className="text-xs text-gray-400">Unser Ernährungsteam antwortet persönlich</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-gray-400 leading-relaxed">
                Noch keine Nachrichten. Schreib uns — wir antworten innerhalb von 24 Stunden.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-primary text-white rounded-2xl rounded-br-sm px-3 py-2">
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className="text-[10px] text-white/60 mt-1 text-right">
                      {formatDate(msg.created_at)}
                    </p>
                  </div>
                </div>

                {/* Admin reply */}
                {msg.admin_reply ? (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-3 py-2">
                      <p className="text-[10px] text-primary font-medium mb-1">Janine</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{msg.admin_reply}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {msg.replied_at ? formatDate(msg.replied_at) : ""}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 pl-1">
                    <Clock className="w-3 h-3 text-gray-300" />
                    <p className="text-[10px] text-gray-300">Antwort ausstehend</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Compose */}
        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
          {sent && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 mb-2">
              <CheckCheck className="w-3.5 h-3.5" />
              Nachricht gesendet! Wir melden uns bald.
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Deine Nachricht an Janine..."
              rows={2}
              className="flex-1 resize-none px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary-light transition disabled:opacity-40 flex-shrink-0 self-end"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
