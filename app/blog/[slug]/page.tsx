import { createSupabaseAdmin } from "@/lib/supabase/server";
import { BlogArticle } from "@/components/blog/blog-article";
import { BlogCta } from "@/components/blog/blog-cta";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ea_blog_posts")
    .select("title, meta_description, excerpt, cover_image_url")
    .eq("slug", params.slug)
    .eq("status", "published")
    .limit(1);

  const post = data?.[0];
  if (!post) return { title: "Artikel nicht gefunden" };

  const description = post.meta_description || post.excerpt || "";

  return {
    title: `${post.title} – Ernährungsberatung`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      images: post.cover_image_url ? [post.cover_image_url] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const supabase = createSupabaseAdmin();

  const { data } = await supabase
    .from("ea_blog_posts")
    .select("*")
    .eq("slug", params.slug)
    .eq("status", "published")
    .limit(1);

  const post = data?.[0];
  if (!post) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Alle Artikel
      </Link>

      {/* Article Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          {post.category && (
            <span className="text-xs font-medium bg-primary-bg text-primary px-2.5 py-1 rounded-full">
              {post.category}
            </span>
          )}
          {post.published_at && (
            <span className="flex items-center gap-1 text-sm text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(post.published_at).toLocaleDateString("de-DE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-4 text-lg text-gray-500 leading-relaxed">
            {post.excerpt}
          </p>
        )}
      </header>

      {/* Cover Image */}
      {post.cover_image_url && (
        <img
          src={post.cover_image_url}
          alt={post.title}
          className="w-full rounded-2xl mb-10 aspect-[2/1] object-cover"
        />
      )}

      {/* Article Content */}
      <article>
        <BlogArticle content={post.content} />
      </article>

      {/* CTA */}
      <BlogCta />
    </div>
  );
}
