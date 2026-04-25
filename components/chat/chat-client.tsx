"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Send, Leaf, User, History, ArrowLeft, ThumbsUp, ThumbsDown, X, MessageCircle, Sparkles, Lock, ImagePlus, Download } from "lucide-react";
import { ChatMessage } from "./message";
import { HistorySidebar } from "./history-sidebar";
import { DirectMessagePanel } from "./direct-message-panel";
import { DmToast } from "./dm-toast";
import { CreditTopupModal } from "@/components/credit-topup-modal";
import { CreditBadge } from "@/components/credit-badge";
import { VoiceInputButton } from "@/components/ui/voice-input-button";
import { createClient } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  imageDataUrl?: string;
  ragInfo?: { chunks: number; confidence: "high" | "low" | "none"; sources: string };
}

interface ChatClientProps {
  userId: string;
  userName: string;
  initialPlan?: string;
}

type FeedbackState = "idle" | "prompt" | "comment" | "done";

const DM_SEEN_KEY = (userId: string) => `dm_seen_${userId}`;
const IMAGE_TOOLTIP_KEY = "chat_image_tooltip_shown";

/**
 * Compress an image file client-side to JPEG at max 1600px on the long edge.
 * Returns a data URL ready for base64 send and preview.
 */
async function compressImage(file: File): Promise<{ dataUrl: string; base64: string; mediaType: "image/jpeg" }> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.85
    );
  });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const base64 = dataUrl.split(",")[1] || "";
  return { dataUrl, base64, mediaType: "image/jpeg" };
}

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

export function ChatClient({ userId, userName, initialPlan }: ChatClientProps) {
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

  // Subscription plan for feature gating (Janine direkt, Sonnet badge)
  const [userPlan, setUserPlan] = useState<string>(initialPlan || "free");
  const [showJanineLock, setShowJanineLock] = useState(false);
  const janineLocked = userPlan !== "pro_plus" && userPlan !== "admin";
  const isPremiumChat = userPlan === "pro_plus" || userPlan === "admin";

  // Chat image upload (premium feature)
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; base64: string; mediaType: "image/jpeg" } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showImageLock, setShowImageLock] = useState(false);
  const [showImageTooltip, setShowImageTooltip] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUserPlan(data?.plan || "free"))
      .catch(() => setUserPlan("free"));
  }, []);

  // First-visit tooltip for premium users — show once then remember.
  useEffect(() => {
    if (!isPremiumChat) return;
    try {
      if (localStorage.getItem(IMAGE_TOOLTIP_KEY)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => {
      setShowImageTooltip(true);
      try {
        localStorage.setItem(IMAGE_TOOLTIP_KEY, "1");
      } catch {}
      setTimeout(() => setShowImageTooltip(false), 5000);
    }, 800);
    return () => clearTimeout(t);
  }, [isPremiumChat]);

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

  function handleImageButtonClick() {
    if (!isPremiumChat) {
      setShowImageLock((v) => !v);
      return;
    }
    setShowImageTooltip(false);
    imageInputRef.current?.click();
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Bitte wähle ein Bild aus.");
      return;
    }
    setImageError(null);
    try {
      const compressed = await compressImage(file);
      setPendingImage(compressed);
      inputRef.current?.focus();
    } catch (err) {
      console.error("Image compress failed:", err);
      setImageError("Bild konnte nicht verarbeitet werden.");
    }
  }

  async function handleSend() {
    const text = input.trim();
    const hasImage = !!pendingImage;
    if ((!text && !hasImage) || isStreaming) return;

    const displayText = text || (hasImage ? "" : "");
    const imageDataUrl = pendingImage?.dataUrl;
    const imagePayload = pendingImage
      ? { base64: pendingImage.base64, mediaType: pendingImage.mediaType }
      : null;

    setInput("");
    setPendingImage(null);
    const userMsg: Message = { role: "user", content: displayText, imageDataUrl };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages, userId, image: imagePayload }),
      });

      if (response.status === 403) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Bild-Upload im Chat ist im **Premium-Plan** verfügbar. Upgrade, um Speisekarten und Essen fotografieren zu lassen. 💚",
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

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
      let ragBuffer = "";
      let ragParsed = false;
      const isAdminPlan = initialPlan === "admin";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = JSON.parse(line.slice(6));
          if (data.type === "text") {
            let delta: string = data.text;

            // Admin only: first server event may be a [RAG: ...] marker.
            // Strip it out of the visible stream and attach to the message.
            if (isAdminPlan && !ragParsed) {
              ragBuffer += delta;
              const match = ragBuffer.match(/^\[RAG: (\d+) chunks, (high|low|none), ([^\]]*)\]\n?/);
              if (match) {
                const ragInfo = {
                  chunks: parseInt(match[1], 10),
                  confidence: match[2] as "high" | "low" | "none",
                  sources: match[3],
                };
                delta = ragBuffer.slice(match[0].length);
                ragBuffer = "";
                ragParsed = true;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === "assistant") {
                    updated[updated.length - 1] = { ...last, ragInfo };
                  }
                  return updated;
                });
                if (!delta) continue;
              } else if (ragBuffer.length > 200 || !ragBuffer.startsWith("[")) {
                // Not a marker — flush buffer and stop trying.
                delta = ragBuffer;
                ragBuffer = "";
                ragParsed = true;
              } else {
                continue;
              }
            }

            assistantContent += delta;
            const deltaText = delta;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + deltaText };
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

      {/* Image lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-label="Bildvorschau"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Bildvorschau"
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

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
              <div className="flex items-center gap-2">
                {isPremiumChat && (
                  <a
                    href={`/api/chat/export?sessionId=${sessionIdRef.current}`}
                    download
                    className="flex items-center gap-1 text-xs text-ink-muted hover:text-primary transition"
                    title="Chat exportieren"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </a>
                )}
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary-hover transition"
                >
                  Neues Gespräch starten
                </button>
              </div>
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
                  {isPremiumChat && (
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="sm:col-span-2 flex items-center gap-3 bg-gradient-to-r from-amber-50 to-white border border-amber-200 text-left px-4 py-3 rounded-2xl hover:border-amber-300 hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200 group"
                    >
                      <span className="text-xl">📸</span>
                      <span className="text-[13px] text-amber-800 leading-snug font-medium">Speisekarte fotografieren — ich berate dich</span>
                    </button>
                  )}
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
                    <div className={`flex flex-col ${msg.role === "user" ? "items-end max-w-[85%] md:max-w-[75%]" : "items-start max-w-[90%] md:max-w-[80%]"}`}>
                      {msg.role === "user" && msg.imageDataUrl && (
                        <button
                          type="button"
                          onClick={() => setLightboxImage(msg.imageDataUrl!)}
                          className="mb-1.5 rounded-2xl overflow-hidden shadow-card border border-border hover:opacity-90 transition"
                          aria-label="Bild vergrößern"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.imageDataUrl}
                            alt="Hochgeladenes Bild"
                            className="block max-w-[220px] max-h-[220px] object-cover"
                          />
                        </button>
                      )}
                      {msg.role === "assistant" && msg.ragInfo && (
                        <div
                          className={`mb-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                            msg.ragInfo.confidence === "high"
                              ? "bg-green-50 border-green-300 text-green-800"
                              : msg.ragInfo.confidence === "low"
                              ? "bg-amber-50 border-amber-300 text-amber-800"
                              : "bg-red-50 border-red-300 text-red-800"
                          }`}
                          title={`Quellen: ${msg.ragInfo.sources || "–"}`}
                        >
                          RAG: {msg.ragInfo.chunks} · {msg.ragInfo.confidence}
                          {msg.ragInfo.sources && (
                            <span className="opacity-70 truncate max-w-[220px]">
                              · {msg.ragInfo.sources}
                            </span>
                          )}
                        </div>
                      )}
                      {(msg.role === "assistant" || msg.content) && (
                        <div
                          className={`px-4 py-2.5 ${
                            msg.role === "user"
                              ? "bg-primary text-white rounded-2xl rounded-br-sm shadow-card"
                              : "bg-white border border-border rounded-2xl rounded-bl-sm shadow-card"
                          }`}
                        >
                          {msg.role === "assistant" ? (
                            <ChatMessage content={msg.content} isStreaming={isStreaming && i === messages.length - 1} />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          )}
                        </div>
                      )}
                      {msg.role === "assistant" && msg.content && (
                        <div className="mt-1 flex items-center gap-2 px-1">
                          <span
                            title="Antwort generiert von KI auf Basis von Janines Wissensbasis"
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-primary"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            KI
                          </span>
                          <span className="text-[11px] text-ink-faint">
                            Ersetzt keine ärztliche Beratung
                          </span>
                        </div>
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
                  <div className="bg-white border border-border rounded-2xl rounded-bl-sm shadow-card px-4 py-3">
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
          <div
            data-tour="chat-input"
            className="border-t border-border bg-white/80 backdrop-blur-md px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0))] md:pb-4"
          >
            <div className="max-w-3xl mx-auto">
              {/* Info bar above input */}
              <div className="flex items-center justify-between mb-2 px-1">
                <span data-tour="credits">
                  <CreditBadge />
                </span>
                <div className="relative">
                  <button
                    onClick={() => {
                      if (janineLocked) {
                        setShowJanineLock((v) => !v);
                        return;
                      }
                      if (dmOpen) setDmOpen(false);
                      else handleOpenDm();
                    }}
                    className={`relative flex items-center gap-1.5 text-xs font-medium transition-all duration-200 px-2.5 py-1 rounded-full ${
                      janineLocked
                        ? "text-ink-muted hover:text-ink hover:bg-surface-muted"
                        : "text-primary hover:text-primary-hover hover:bg-primary-pale"
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Janine schreiben
                    {janineLocked && <Lock className="w-3 h-3 text-ink-faint" />}
                    {!janineLocked && unreadDMs > 0 && (
                      <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {unreadDMs}
                      </span>
                    )}
                  </button>
                  {showJanineLock && janineLocked && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-border shadow-pop p-4 z-50 animate-fade-in">
                      <div className="flex items-start gap-2.5 mb-2">
                        <div className="w-7 h-7 rounded-full bg-primary-pale flex items-center justify-center flex-shrink-0">
                          <Lock className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <p className="text-sm text-ink leading-snug">
                          Direktnachrichten an Janine sind im <span className="font-medium">Premium-Plan</span> enthalten.
                        </p>
                      </div>
                      <Link
                        href="/#pricing"
                        className="block w-full text-center text-xs font-medium bg-primary text-white rounded-full px-3 py-2 hover:bg-primary-hover transition mt-2"
                      >
                        Premium ansehen
                      </Link>
                      <button
                        onClick={() => setShowJanineLock(false)}
                        className="absolute top-2 right-2 text-ink-faint hover:text-ink"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Hidden file input for image upload */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelected}
                className="hidden"
              />

              {/* Image preview above input */}
              {pendingImage && (
                <div className="mb-2 flex items-start gap-2 animate-fade-in">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pendingImage.dataUrl}
                      alt="Vorschau"
                      className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border border-border shadow-card"
                    />
                    <button
                      onClick={() => setPendingImage(null)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-border rounded-full flex items-center justify-center shadow-card hover:bg-surface-muted"
                      aria-label="Bild entfernen"
                    >
                      <X className="w-3 h-3 text-ink" />
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-faint mt-1">
                    Bild hinzugefügt. Schreibe optional eine Frage dazu.
                  </p>
                </div>
              )}
              {imageError && (
                <p className="mb-1.5 text-[11px] text-red-500">{imageError}</p>
              )}

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
                {/* Image upload button */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={handleImageButtonClick}
                    title={isPremiumChat ? "Bild hochladen" : "Bild-Upload ist im Premium-Plan verfügbar"}
                    aria-label="Bild hochladen"
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-200 ${
                      isPremiumChat
                        ? "border-border bg-white text-primary hover:border-primary/40 hover:bg-primary-pale"
                        : "border-border bg-surface-muted text-ink-faint hover:text-ink-muted"
                    }`}
                  >
                    <ImagePlus className="w-4 h-4" />
                    {!isPremiumChat && (
                      <Lock className="w-2.5 h-2.5 absolute top-1.5 right-1.5 text-ink-faint" />
                    )}
                  </button>
                  {/* First-visit tooltip for premium */}
                  {showImageTooltip && isPremiumChat && (
                    <div className="absolute bottom-full mb-2 left-0 w-60 bg-ink text-white rounded-xl px-3 py-2 shadow-pop z-40 animate-fade-in">
                      <p className="text-xs leading-snug">
                        Neu: Fotografiere Speisekarten oder Essen — ich berate dich direkt!
                      </p>
                      <div className="absolute -bottom-1 left-4 w-2 h-2 bg-ink rotate-45" />
                    </div>
                  )}
                  {/* Lock popover for non-premium */}
                  {showImageLock && !isPremiumChat && (
                    <div className="absolute bottom-full mb-2 left-0 w-64 bg-white rounded-2xl border border-border shadow-pop p-4 z-50 animate-fade-in">
                      <div className="flex items-start gap-2.5 mb-2">
                        <div className="w-7 h-7 rounded-full bg-primary-pale flex items-center justify-center flex-shrink-0">
                          <Lock className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <p className="text-sm text-ink leading-snug">
                          Bild-Upload im Chat ist im <span className="font-medium">Premium-Plan</span> verfügbar.
                        </p>
                      </div>
                      <Link
                        href="/#pricing"
                        className="block w-full text-center text-xs font-medium bg-primary text-white rounded-full px-3 py-2 hover:bg-primary-hover transition mt-2"
                      >
                        Premium ansehen
                      </Link>
                      <button
                        onClick={() => setShowImageLock(false)}
                        className="absolute top-2 right-2 text-ink-faint hover:text-ink"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={pendingImage ? "Frage zum Bild (optional)…" : historyMode ? "Schreibe weiter im bisherigen Gespräch…" : "Stelle eine Ernährungsfrage…"}
                    rows={1}
                    className="w-full resize-none pl-4 pr-24 py-3 border border-border rounded-2xl text-sm bg-stone-50 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all duration-200 max-h-32"
                  />
                  {/* Voice input — Web Speech API, available to all tiers in chat. */}
                  <VoiceInputButton
                    size="sm"
                    disabled={isStreaming}
                    onTranscript={(text) => setInput(text)}
                    onFinal={(text) => {
                      setInput(text);
                      inputRef.current?.focus();
                    }}
                    className="absolute right-12 bottom-2"
                  />
                  <button
                    onClick={handleSend}
                    disabled={(!input.trim() && !pendingImage) || isStreaming}
                    className="absolute right-2 bottom-2 w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-hover transition-all duration-200 disabled:opacity-50 disabled:bg-ink-faint disabled:cursor-not-allowed shadow-card"
                    aria-label="Senden"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Model badge */}
              <div className="flex items-center justify-end mt-1.5 px-1">
                {isPremiumChat ? (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border border-amber-200"
                    title="Premium-Qualität: Claude Sonnet · 2 Credits pro Nachricht"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    Sonnet
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface-muted text-ink-faint"
                    title="Haiku · 1 Credit pro Nachricht"
                  >
                    Haiku
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
