"use client";

import { useState, useEffect } from "react";
import { MessageSquare, ChevronLeft, ChevronRight, Loader2, BookOpen, Hash, Leaf, ChevronDown, ChevronUp } from "lucide-react";
import { AufnehmenDialog } from "@/components/admin/aufnehmen-dialog";

interface Question {
  id: string;
  content: string;
  session_id: string;
  created_at: string;
  ai_reply: string | null;
}

interface Theme {
  word: string;
  count: number;
}

function QuestionCard({
  q,
  onAufnehmen,
}: {
  q: Question;
  onAufnehmen: (q: Question) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Question row */}
      <div className="p-4">
        <p className="text-sm text-gray-700 leading-relaxed">{q.content}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {new Date(q.created_at).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="text-xs text-gray-300">
              Session: {q.session_id.slice(0, 8)}...
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAufnehmen(q)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary-light transition"
            >
              <BookOpen className="w-3 h-3" />
              In Wissensbasis
            </button>
            {q.ai_reply && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition border border-gray-200 rounded-lg px-2 py-1 hover:border-gray-300"
              >
                <Leaf className="w-3 h-3" />
                KI-Antwort
                {expanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI reply */}
      {expanded && q.ai_reply && (
        <div className="border-t border-gray-50 bg-primary-bg/20 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Leaf className="w-3 h-3 text-primary" />
            <p className="text-xs font-medium text-primary">KI-Antwort</p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {q.ai_reply}
          </p>
        </div>
      )}
    </div>
  );
}

export default function AdminFragenPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [themes, setThemes] = useState<Theme[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);

  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/fragen?page=${page}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setQuestions(data.questions);
          setTotalPages(data.pages);
          setTotal(data.total);
        }
        setLoading(false);
      });
  }, [page]);

  useEffect(() => {
    fetch("/api/admin/fragen/themen")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setThemes(data);
        setThemesLoading(false);
      });
  }, []);

  const maxCount = themes.length ? Math.max(...themes.map((t) => t.count)) : 1;
  const withReply = questions.filter((q) => q.ai_reply).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Nutzerfragen</h1>
      <p className="text-gray-500 text-sm mb-6">
        Anonymisierte Fragen und KI-Antworten – erkenne Muster und prüfe die Qualität.
      </p>

      {/* Top Themen */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium text-gray-700">Top Themen</h2>
        </div>
        {themesLoading ? (
          <div className="flex gap-2 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 bg-gray-100 rounded-full w-16" />
            ))}
          </div>
        ) : themes.length === 0 ? (
          <p className="text-xs text-gray-400">Noch nicht genug Daten für Themen-Analyse.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {themes.map((theme) => {
              const intensity = theme.count / maxCount;
              return (
                <span
                  key={theme.word}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-100"
                  style={{
                    fontSize: `${Math.max(11, 11 + intensity * 4)}px`,
                    backgroundColor: `rgba(45, 106, 79, ${0.05 + intensity * 0.12})`,
                    color: `rgba(45, 106, 79, ${0.6 + intensity * 0.4})`,
                  }}
                >
                  {theme.word}
                  <span className="text-[10px] opacity-60">{theme.count}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-primary-bg/30 rounded-xl px-4 py-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-sm text-gray-600">
            <span className="font-medium">{total}</span> Fragen gesamt
          </span>
        </div>
        {withReply > 0 && (
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" />
            <span className="text-sm text-gray-600">
              <span className="font-medium">{withReply}</span> mit KI-Antwort
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Noch keine Nutzerfragen vorhanden.</p>
          <p className="text-xs mt-1">
            Fragen erscheinen hier sobald Nutzer den Chat verwenden.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {questions.map((q) => (
              <QuestionCard key={q.id} q={q} onAufnehmen={setActiveQuestion} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
                Zurück
              </button>
              <span className="text-sm text-gray-400">
                Seite {page} von {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition disabled:opacity-30"
              >
                Weiter
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {activeQuestion && (
        <AufnehmenDialog
          questionText={activeQuestion.content}
          onClose={() => setActiveQuestion(null)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
