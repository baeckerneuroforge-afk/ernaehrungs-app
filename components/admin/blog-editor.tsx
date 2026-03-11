"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Save, Send, Loader2, Eye, Edit3, BookOpen } from "lucide-react";
import { slugify } from "@/lib/utils/slugify";
import { BLOG_CATEGORIES, type BlogPost } from "@/types";

interface Props {
  post?: BlogPost;
  mode: "create" | "edit";
}

export function BlogEditor({ post, mode }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [addToWissensbasis, setAddToWissensbasis] = useState(false);

  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [category, setCategory] = useState(post?.category || "");
  const [metaDescription, setMetaDescription] = useState(post?.meta_description || "");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url || "");

  const slug = post?.slug || slugify(title);

  useEffect(() => {
    if (post) {
      setAddToWissensbasis(post.in_wissensbasis);
    }
  }, [post]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);

    const body = { title, content, excerpt, category, meta_description: metaDescription, cover_image_url: coverImageUrl };

    if (mode === "create") {
      const res = await fetch("/api/admin/blog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.post) {
        router.push(`/admin/blog/${data.post.id}`);
      }
    } else if (post) {
      await fetch(`/api/admin/blog/${post.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }

    setSaving(false);
  }

  async function handlePublish() {
    if (!post) return;
    setPublishing(true);

    const isPublished = post.status === "published";
    await fetch(`/api/admin/blog/${post.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: isPublished ? "unpublish" : "publish",
        add_to_wissensbasis: !isPublished && addToWissensbasis,
      }),
    });

    setPublishing(false);
    router.refresh();
    window.location.reload();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {mode === "create" ? "Neuer Artikel" : "Artikel bearbeiten"}
          </h1>
          {slug && (
            <p className="text-xs text-gray-400 mt-1">/blog/{slug}</p>
          )}
        </div>
        {post && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            post.status === "published"
              ? "bg-primary-bg text-primary"
              : "bg-gray-100 text-gray-500"
          }`}>
            {post.status === "published" ? "Veröffentlicht" : "Entwurf"}
          </span>
        )}
      </div>

      {/* Metadata Fields */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Titel</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Artikeltitel"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Kategorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="">Keine Kategorie</option>
              {BLOG_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Cover-Bild URL (optional)</label>
            <input
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Kurzbeschreibung (Excerpt)</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            placeholder="Kurze Zusammenfassung für die Blog-Übersicht..."
          />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">
            Meta-Description (SEO)
            <span className={`ml-2 ${metaDescription.length > 160 ? "text-red-500" : "text-gray-400"}`}>
              {metaDescription.length}/160
            </span>
          </label>
          <input
            type="text"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Wird in Google-Suchergebnissen angezeigt..."
          />
        </div>
      </div>

      {/* Content Editor */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-800">Inhalt (Markdown)</label>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition px-2.5 py-1.5 rounded-lg border border-gray-200"
          >
            {showPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreview ? "Editor" : "Vorschau"}
          </button>
        </div>

        {showPreview ? (
          <div className="min-h-[400px] prose prose-sm prose-gray max-w-none border border-gray-100 rounded-xl p-6 bg-gray-50">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || "*Noch kein Inhalt*"}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y"
            placeholder="Schreibe deinen Artikel in Markdown..."
          />
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </button>

            {mode === "edit" && post && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className={`flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-40 ${
                  post.status === "published"
                    ? "text-gray-600 border border-gray-200 hover:bg-gray-50"
                    : "text-white bg-primary hover:bg-primary-light"
                }`}
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {post.status === "published" ? "Zurückziehen" : "Veröffentlichen"}
              </button>
            )}
          </div>

          {mode === "edit" && post?.status !== "published" && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={addToWissensbasis}
                onChange={(e) => setAddToWissensbasis(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <BookOpen className="w-4 h-4 text-gray-400" />
              Auch in Wissensbasis aufnehmen
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
