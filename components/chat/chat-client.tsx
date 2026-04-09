"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Leaf, User, History, ArrowLeft, ThumbsUp, ThumbsDown, X, MessageCircle, Sparkles } from "lucide-react";
import { ChatMessage } from "./message";
import { HistorySidebar } from "./history-sidebar";
import { DirectMessagePanel } from "./direct-message-panel";
import { DmToast } from "./dm-toast";
import { CreditTopupModal } from "@/components/credit-topup-modal";
import { CreditBadge } from "@/components/credit-badge";
import { createClient } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatClientProps {
  userId: string;
  userName: string;
}

type FeedbackState = "idle" | "prompt" | "comment" | "done";

const DM_SEEN_KEY = (userId: string) => `dm_seen_${userId}`;

function getSeenIds(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(DM_SEEN_KEY(userId)) || "[]");
  } catch {
    return [];
  }
}

function markAllSeen(userId: string, ids: string[]) {
  localStorage.setItem(DM_SEEN_KEY(userId), JSON.stringify(ids));
}

export function ChatClient({ userId, userName }: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyMode, setHistoryMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  // Direct message state
  const [dmOpen, setDmOpen] = useState(false);
  const [unreadDMs, setUnreadDMs] = useState(0);
  const [showDmToast, setShowDmToast] = useState(false);

  // Credit top-up modal
  const [topupOpen, setTopupOpen] = useState(false);

  // Feedback state
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const [feedbackRating, setFeedbackRating] = useState<1 | -1 | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const feedbackShownForSession = useRef<string>("");

  // Check initial unread DM count
  useEffect(() => {
    fetch("/api/messages")
      .then((r) => (r.ok ? r.json() : []))
      .then((msgs: Array<{ id: string; admin_reply: string | null }>) => {
        const seen = getSeenIds(userId);
        const count = msgs.filter((m) => m.admin_reply && !seen.includes(m.id)).length;
        setUnreadDMs(count);
      })
      .catch(() => {});
  }, [userId]);

  // Supabase Realtime — listen for new replies on ea_messages
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`dm-replies-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ea_messages",
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
          const wasEmpty = !payload.old.admin_reply;
          const hasReply = !!payload.new.admin_reply;
          if (wasEmpty && hasReply) {
            setUnreadDMs((prev) => prev + 1);
            setShowDmToast(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleOpenDm = useCallback(() => {
    setDmOpen(true);
    setUnreadDMs(0);
    setShowDmToast(false);
    // Mark all current replies as seen
    fetch("/api/messages")
      .then((r) => (r.ok ? r.json() : []))
      .then((msgs: Array<{ id: string; admin_reply: string | null }>) => {
        const repliedIds = msgs.filter((m) => m.admin_reply).map((m) => m.id);
        markAllSeen(userId, repliedIds);
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show feedback prompt after 2 complete exchanges
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    if (
      messages.length >= 4 &&
      !isStreaming &&
      !historyMode &&
      feedbackState === "idle" &&
      feedbackShownForSession.current !== sessionId
    ) {
      feedbackShownForSession.current = sessionId;
      setFeedbackState("prompt");
    }
  }, [messages.length, isStreaming, historyMode, feedbackState]);

  function handleNewChat() {
    sessionIdRef.current = crypto.randomUUID();
    setMessages([]);
    setHistoryMode(false);
    setFeedbackState("idle");
    setFeedbackRating(null);
    setFeedbackComment("");
    inputRef.current?.focus();
  }

  async function handleLoadSession(sessionId: string) {
    const res = await fetch(`/api/chat/sessions/${sessionId}`);
    if (!res.ok) return;
    const data = await res.json();
    const loaded: Message[] = data.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    setMessages(loaded);
    setHistoryMode(true);
    setFeedbackState("idle");
    sessionIdRef.current = sessionId;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages, userId }),
      });

      if (response.status === 402) {
        // Insufficient credits — show top-up modal
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Du hast leider **keine Credits mehr**. Lade Credits nach, um weiterzumachen. 💚",
          };
          return updated;
        });
        setIsStreaming(false);
        setTopupOpen(true);
        return;
      }

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = JSON.parse(line.slice(6));
          if (data.type === "text") {
            assistantContent += data.text;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + data.text };
              }
              return updated;
            });
          }
        }
      }

      if (assistantContent) {
        fetch("/api/chat/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            user_message: text,
            assistant_message: assistantContent,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant" && !last.content) {
          updated[updated.length - 1] = {
            ...last,
            content: "Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuche es erneut.",
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function dismissFeedback() {
    setFeedbackState("done");
  }

  function selectRating(rating: 1 | -1) {
    setFeedbackRating(rating);
    setFeedbackState("comment");
  }

  async function submitFeedback() {
    if (!feedbackRating) return;
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionIdRef.current,
        rating: feedbackRating,
        comment: feedbackComment,
      }),
    }).catch(() => {});
    setFeedbackState("done");
  }

  return (
    <>
      {/* Credit Top-Up Modal */}
      <CreditTopupModal open={topupOpen} onClose={() => setTopupOpen(false)} />

      {/* DM Toast notification */}
      {showDmToast && (
        <DmToast
          onClose={() => setShowDmToast(false)}
          onOpen={handleOpenDm}
        />
      )}

      <div className="flex-1 flex overflow-hidden bg-surface-bg">
        <HistorySidebar
          currentSessionId={sessionIdRef.current}
          onSelectSession={handleLoadSession}
          onNewChat={handleNewChat}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {historyMode && (
            <div className="bg-accent-warmPale border-b border-border px-4 py-2.5 flex items-center justify-between">
              <p className="text-xs text-ink-muted">Du führst ein früheres Gespräch fort.</p>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary-hover transition"
              >
                Neues Gespräch starten
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin">
            <div className="md:hidden flex justify-end mb-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-1.5 text-xs text-ink-muted bg-white border border-border px-3 py-1.5 rounded-full hover:border-primary/30 transition-all duration-200"
              >
                <History className="w-3.5 h-3.5" />
                Verlauf
              </button>
            </div>

            {messages.length === 0 && !historyMode && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 max-w-xl mx-auto animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-card">
                  <Leaf className="w-8 h-8 text-white" />
                </div>
                <h2 className="font-serif text-2xl font-semibold text-ink mb-2">
                  Hallo {userName}
                </h2>
                <p className="text-ink-muted text-sm max-w-md mb-8 leading-relaxed">
                  Ich beantworte deine Fragen rund um Ernährung, Nährstoffe und gesunde Lebensweise — basierend auf geprüftem Wissen aus Janines Praxis.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md">
                  {[
                    { icon: "🥗", text: "Erstelle mir einen Tages-Plan" },
                    { icon: "🧬", text: "Welche Vitamine brauche ich?" },
                    { icon: "🥛", text: "Tipps bei Laktoseintoleranz" },
                    { icon: "💪", text: "Wie kann ich mehr Protein essen?" },
                  ].map((s) => (
                    <button
                      key={s.text}
                      onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                      className="flex items-center gap-3 bg-white border border-border text-left px-4 py-3 rounded-2xl hover:border-primary/40 hover:bg-primary-faint hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200 group"
                    >
                      <span className="text-xl">{s.icon}</span>
                      <span className="text-[13px] text-ink-muted group-hover:text-primary leading-snug font-medium">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="max-w-3xl mx-auto w-full space-y-4">
              {messages.map((msg, i) => {
                const prevRole = messages[i - 1]?.role;
                const isGroupStart = prevRole !== msg.role;
                return (
                  <div
                    key={i}
                    className={`flex gap-2.5 animate-slide-in-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className={`w-8 h-8 rounded-full bg-primary-pale flex items-center justify-center flex-shrink-0 ${isGroupStart ? "" : "invisible"}`}>
                        <Leaf className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] px-4 py-2.5 ${
                        msg.role === "user"
                          ? "bg-primary text-white rounded-2xl rounded-br-md shadow-card"
                          : "bg-white border border-border rounded-2xl rounded-bl-md shadow-card"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <>
                          <ChatMessage content={msg.content} isStreaming={isStreaming && i === messages.length - 1} />
                          {msg.content && (
                            <div className="mt-2 flex items-center gap-2">
                              <span
                                title="Antwort generiert von KI auf Basis von Janines Wissensbasis"
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-primary px-2 py-0.5 rounded-full bg-primary-pale"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                KI
                              </span>
                              <span className="text-[10px] text-ink-faint">
                                Ersetzt keine ärztliche Beratung
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className={`w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0 ${isGroupStart ? "" : "invisible"}`}>
                        <User className="w-4 h-4 text-ink-muted" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isStreaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex gap-2.5 animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-primary-pale flex items-center justify-center flex-shrink-0">
                    <Leaf className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-white border border-border rounded-2xl rounded-bl-md shadow-card px-4 py-3">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-typing-dot" />
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-typing-dot [animation-delay:0.15s]" />
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-typing-dot [animation-delay:0.3s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div ref={messagesEndRef} />
          </div>

          {/* Feedback prompt */}
          {(feedbackState === "prompt" || feedbackState === "comment") && (
            <div className="px-4 pb-2">
              <div className="max-w-3xl mx-auto bg-white border border-border rounded-2xl px-4 py-3 shadow-card animate-slide-in-up">
                {feedbackState === "prompt" ? (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-ink-muted flex-1">War diese Beratung hilfreich?</p>
                    <button
                      onClick={() => selectRating(1)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border text-sm text-ink-muted hover:border-primary/40 hover:text-primary hover:bg-primary-pale/50 transition-all duration-200"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Ja
                    </button>
                    <button
                      onClick={() => selectRating(-1)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border text-sm text-ink-muted hover:border-red-200 hover:text-red-500 hover:bg-red-50/40 transition-all duration-200"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      Nein
                    </button>
                    <button onClick={dismissFeedback} className="p-1.5 text-ink-faint hover:text-ink-muted transition rounded-full">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-ink-muted">
                      {feedbackRating === 1 ? "Danke!" : "Schade."} Magst du noch etwas ergänzen?
                    </p>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Was hat gut / nicht gut funktioniert? (optional)"
                      rows={2}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none bg-surface-bg"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={dismissFeedback} className="text-xs text-ink-faint hover:text-ink-muted transition px-2 py-1">
                        Überspringen
                      </button>
                      <button
                        onClick={submitFeedback}
                        className="text-xs text-white bg-primary px-4 py-1.5 rounded-full hover:bg-primary-hover transition-all duration-200"
                      >
                        Absenden
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {feedbackState === "done" && feedbackRating !== null && (
            <div className="px-4 pb-2">
              <div className="max-w-3xl mx-auto">
                <p className="text-center text-xs text-ink-faint py-1">Danke für dein Feedback!</p>
              </div>
            </div>
          )}

          {/* Direct message panel */}
          {dmOpen && (
            <div className="relative">
              <DirectMessagePanel onClose={() => setDmOpen(false)} />
            </div>
          )}

          {/* Input area — iMessage style with Send inside */}
          <div className="border-t border-border bg-white/80 backdrop-blur-md px-4 pt-3 pb-3 md:pb-4">
            <div className="max-w-3xl mx-auto">
              {/* Info bar above input */}
              <div className="flex items-center justify-between mb-2 px-1">
                <CreditBadge />
                <button
                  onClick={() => dmOpen ? setDmOpen(false) : handleOpenDm()}
                  className="relative flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover transition-all duration-200 px-2.5 py-1 rounded-full hover:bg-primary-pale"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Janine schreiben
                  {unreadDMs > 0 && (
                    <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadDMs}
                    </span>
                  )}
                </button>
              </div>

              {/* Input field */}
              <div className="relative flex items-end gap-2">
                {historyMode && (
                  <button
                    onClick={handleNewChat}
                    title="Neues Gespräch starten"
                    className="flex items-center gap-1 text-xs text-ink-muted border border-border px-3 py-3 rounded-full hover:border-primary/40 hover:text-primary transition-all duration-200 flex-shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="relative flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={historyMode ? "Schreibe weiter im bisherigen Gespräch…" : "Stelle eine Ernährungsfrage…"}
                    rows={1}
                    className="w-full resize-none pl-4 pr-12 py-3 border border-border rounded-2xl text-sm bg-surface-bg placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all duration-200 max-h-32"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                    className="absolute right-2 bottom-2 w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-hover transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-card"
                    aria-label="Senden"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
