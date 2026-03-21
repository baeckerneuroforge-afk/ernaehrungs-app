"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Leaf, User, History, ArrowLeft, ThumbsUp, ThumbsDown, X, MessageCircle } from "lucide-react";
import { ChatMessage } from "./message";
import { HistorySidebar } from "./history-sidebar";
import { DirectMessagePanel } from "./direct-message-panel";
import { DmToast } from "./dm-toast";
import { CreditTopupModal } from "@/components/credit-topup-modal";
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
    if (!text || isStreaming || historyMode) return;

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

      <div className="flex-1 flex overflow-hidden">
        <HistorySidebar
          currentSessionId={sessionIdRef.current}
          onSelectSession={handleLoadSession}
          onNewChat={handleNewChat}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {historyMode && (
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center justify-between">
              <p className="text-xs text-amber-700">Du siehst ein vergangenes Gespräch.</p>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary-light transition"
              >
                Neues Gespräch starten
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            <div className="md:hidden flex justify-end mb-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:border-primary/30 transition"
              >
                <History className="w-3.5 h-3.5" />
                Verlauf
              </button>
            </div>

            {messages.length === 0 && !historyMode && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-5 shadow-sm">
                  <Leaf className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Hallo {userName}!</h2>
                <p className="text-gray-400 text-sm max-w-sm mb-8 leading-relaxed">
                  Ich beantworte deine Fragen rund um Ernährung, Nährstoffe und gesunde Lebensweise – basierend auf geprüftem Wissen.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-sm">
                  {[
                    { icon: "🥗", text: "Tages-Ernährungsplan erstellen" },
                    { icon: "🧬", text: "Welche Vitamine brauche ich?" },
                    { icon: "🥛", text: "Tipps bei Laktoseintoleranz" },
                  ].map((s) => (
                    <button
                      key={s.text}
                      onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                      className="flex flex-col items-start gap-1.5 bg-white border border-gray-200 text-left px-4 py-3 rounded-xl hover:border-primary/40 hover:bg-primary-bg/30 transition group"
                    >
                      <span className="text-lg">{s.icon}</span>
                      <span className="text-xs text-gray-600 group-hover:text-primary leading-snug">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-primary-bg flex items-center justify-center flex-shrink-0 mt-1">
                    <Leaf className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-white border border-gray-100 rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <ChatMessage content={msg.content} isStreaming={isStreaming && i === messages.length - 1} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                )}
              </div>
            ))}

            {isStreaming && messages[messages.length - 1]?.content === "" && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary-bg flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Feedback prompt */}
          {(feedbackState === "prompt" || feedbackState === "comment") && (
            <div className="px-4 pb-2">
              <div className="max-w-3xl mx-auto bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                {feedbackState === "prompt" ? (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-600 flex-1">War diese Beratung hilfreich?</p>
                    <button
                      onClick={() => selectRating(1)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-primary/40 hover:text-primary hover:bg-primary-bg/20 transition"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Ja
                    </button>
                    <button
                      onClick={() => selectRating(-1)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-red-200 hover:text-red-500 hover:bg-red-50/40 transition"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      Nein
                    </button>
                    <button onClick={dismissFeedback} className="p-1.5 text-gray-300 hover:text-gray-500 transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {feedbackRating === 1 ? "Danke!" : "Schade."} Magst du noch etwas ergänzen?
                    </p>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Was hat gut / nicht gut funktioniert? (optional)"
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={dismissFeedback} className="text-xs text-gray-400 hover:text-gray-600 transition px-2 py-1">
                        Überspringen
                      </button>
                      <button
                        onClick={submitFeedback}
                        className="text-xs text-white bg-primary px-3 py-1.5 rounded-lg hover:bg-primary-light transition"
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
                <p className="text-center text-xs text-gray-400 py-1">Danke für dein Feedback!</p>
              </div>
            </div>
          )}

          {/* Direct message panel */}
          {dmOpen && (
            <div className="relative">
              <DirectMessagePanel onClose={() => setDmOpen(false)} />
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 bg-white px-4 py-3">
            {historyMode ? (
              <div className="max-w-3xl mx-auto text-center">
                <button
                  onClick={handleNewChat}
                  className="inline-flex items-center gap-2 text-sm text-white bg-primary px-4 py-2.5 rounded-xl hover:bg-primary-light transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Neues Gespräch starten
                </button>
              </div>
            ) : (
              <>
                <div className="max-w-3xl mx-auto flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Stelle eine Ernährungsfrage..."
                    rows={1}
                    className="flex-1 resize-none px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                    className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary-light transition disabled:opacity-40 flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {/* Footer with DM button + badge */}
                <div className="flex items-center justify-center gap-3 mt-2">
                  <p className="text-xs text-gray-400">Diese Beratung ersetzt keinen Arztbesuch.</p>
                  <span className="text-gray-200">·</span>
                  <button
                    onClick={() => dmOpen ? setDmOpen(false) : handleOpenDm()}
                    className="relative flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition"
                  >
                    <MessageCircle className="w-3 h-3" />
                    Janine schreiben
                    {unreadDMs > 0 && (
                      <span className="absolute -top-2 -right-3 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {unreadDMs}
                      </span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
