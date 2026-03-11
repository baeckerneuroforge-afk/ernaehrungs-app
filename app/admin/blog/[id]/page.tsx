"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { BlogEditor } from "@/components/admin/blog-editor";
import { Loader2 } from "lucide-react";
import type { BlogPost } from "@/types";

export default function EditBlogPostPage() {
  const params = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/blog/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data.post);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!post) {
    return <p className="text-center text-gray-500 py-20">Artikel nicht gefunden.</p>;
  }

  return <BlogEditor post={post} mode="edit" />;
}
