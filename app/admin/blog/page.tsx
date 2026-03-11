"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Trash2, FileText, Loader2, ExternalLink } from "lucide-react";
import type { BlogPost } from "@/types";

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    const res = await fetch("/api/admin/blog");
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" wirklich löschen?`)) return;
    setDeleting(id);
    await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    setDeleting(null);
    loadPosts();
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Blog</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Erstelle und verwalte Blog-Artikel für die öffentliche Seite.
          </p>
        </div>
        <Link
          href="/admin/blog/neu"
          className="flex items-center gap-2 text-sm font-medium text-white bg-primary px-4 py-2.5 rounded-xl hover:bg-primary-light transition"
        >
          <Plus className="w-4 h-4" />
          Neuer Artikel
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">
          Artikel ({posts.length})
        </h3>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Noch keine Artikel erstellt.</p>
            <p className="text-xs mt-1">Erstelle deinen ersten Blog-Artikel.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between px-4 py-3 bg-surface-muted rounded-xl"
              >
                <Link
                  href={`/admin/blog/${post.id}`}
                  className="flex-1 min-w-0 group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 group-hover:text-primary transition truncate">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {post.category && (
                          <span className="text-xs bg-primary-bg text-primary px-2 py-0.5 rounded-full">
                            {post.category}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          post.status === "published"
                            ? "bg-green-50 text-green-600"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {post.status === "published" ? "Veröffentlicht" : "Entwurf"}
                        </span>
                        {post.in_wissensbasis && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            Wissensbasis
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(post.updated_at).toLocaleDateString("de-DE")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-2 ml-3">
                  {post.status === "published" && (
                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      className="text-gray-400 hover:text-primary transition p-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(post.id, post.title)}
                    disabled={deleting === post.id}
                    className="text-gray-400 hover:text-red-500 transition p-1"
                  >
                    {deleting === post.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
