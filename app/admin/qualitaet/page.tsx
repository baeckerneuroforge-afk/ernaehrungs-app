"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Loader2, Star, Leaf, User } from "lucide-react";

interface SessionMessage {
  role: string;
  content: string;
  created_at: string;
}

interface SessionFeedback {
  rating: number;
  comment: string | null;
}

interface QualitySession {
  session_id: string;
  user_name: string;
  messages: SessionMessage[];
  feedback: SessionFeedback | null;
  last_message_at: string;
}

function ratingBadge(feedback: SessionFeedback | null) {
  if (!feedback) return null;
  const positive = feedback.rating === 1;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
        positive
          ? "bg-green-50 text-green-700 border border-green-100"
          : "bg-red-50 text-red-600 border border-red-100"
      }`}
    >
      {positive ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
      {positive ? "Hilfreich" : "Nicht hilfreich"}
    </span>
  );
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

export default function AdminQualitaetPage() {
  const [sessions, setSessions] = useState<QualitySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/qualitaet")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setSessions(data);
        setLoading(false);
      });
  }, []);

  const withFeedback = sessions.filter((s) => s.feedback);
  const thumbsUp = withFeedback.filter((s) => s.feedback?.rating === 1).length;
  const thumbsDown = withFeedback.filter((s) => s.feedback?.rating === -1).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Qualitätssicherung</h1>
      <p className="text-gray-500 text-sm mb-6">
        Gespräche von Nutzern, die der Qualitätsprüfung zugestimmt haben.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Gespräche verfügbar</p>
          <p className="text-2xl font-bold text-gray-800">{sessions.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Positives Feedback</p>
          <div className="flex items-center gap-1.5">
            <ThumbsUp className="w-4 h-4 text-green-600" />
            <p className="text-2xl font-bold text-gray-800">{thumbsUp}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Negatives Feedback</p>
          <div className="flex items-center gap-1.5">
            <ThumbsDown className="w-4 h-4 text-red-500" />
            <p className="text-2xl font-bold text-gray-800">{thumbsDown}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <Star className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">
            Noch keine Gespräche verfügbar.
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Nutzer müssen der Qualitätsprüfung im Onboarding zustimmen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.session_id}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden"
            >
              {/* Session header */}
              <button
                onClick={() =>
                  setExpanded(expanded === session.session_id ? null : session.session_id)
                }
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/50 transition"
              >
                <div className="w-8 h-8 rounded-full bg-primary-bg flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {session.user_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800">{session.user_name}</p>
                    {ratingBadge(session.feedback)}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(session.last_message_at)} ·{" "}
                    {session.messages.length} Nachrichten
                  </p>
                  {session.feedback?.comment && (
                    <p className="text-xs text-gray-500 mt-0.5 italic truncate">
                      &ldquo;{session.feedback.comment}&rdquo;
                    </p>
                  )}
                </div>
                {expanded === session.session_id ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>

              {/* Expanded conversation */}
              {expanded === session.session_id && (
                <div className="border-t border-gray-50 px-4 py-4 space-y-3 bg-gray-50/30">
                  {session.messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-2.5 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-6 h-6 rounded-lg bg-primary-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Leaf className="w-3 h-3 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-white rounded-br-sm"
                            : "bg-white border border-gray-100 text-gray-700 rounded-bl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-6 h-6 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="w-3 h-3 text-gray-500" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Feedback block */}
                  {session.feedback && (
                    <div
                      className={`mt-4 rounded-xl px-3 py-2.5 border text-xs ${
                        session.feedback.rating === 1
                          ? "bg-green-50 border-green-100 text-green-800"
                          : "bg-red-50 border-red-100 text-red-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-medium mb-1">
                        {session.feedback.rating === 1 ? (
                          <ThumbsUp className="w-3 h-3" />
                        ) : (
                          <ThumbsDown className="w-3 h-3" />
                        )}
                        Nutzerfeedback
                      </div>
                      {session.feedback.comment ? (
                        <p>&ldquo;{session.feedback.comment}&rdquo;</p>
                      ) : (
                        <p className="opacity-60">Kein Kommentar.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
