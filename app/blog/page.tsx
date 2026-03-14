import { createSupabaseAdmin } from "@/lib/supabase/server";
import { BlogCard } from "@/components/blog/blog-card";
import { CategoryFilter } from "@/components/blog/category-filter";
import { Leaf } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog – Ernährungsberatung",
  description: "Fundierte Artikel rund um Ernährung, Rezepte und gesunde Lebensweise. Wissenschaftlich basiert und alltagstauglich.",
  openGraph: {
    title: "Blog – Ernährungsberatung",
    description: "Fundierte Artikel rund um Ernährung, Rezepte und gesunde Lebensweise.",
    type: "website",
  },
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("ea_blog_posts")
    .select("id, title, slug, excerpt, category, cover_image_url, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (searchParams.category) {
    query = query.eq("category", searchParams.category);
  }

  const { data: posts } = await query;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Blog</h1>
        </div>
        <p className="text-gray-500 text-sm sm:text-base max-w-2xl">
          Fundierte Artikel rund um Ernährung, Rezepte und gesunde Lebensweise – geschrieben von einer Ernährungswissenschaftlerin.
        </p>
      </div>

      {/* Category Filter */}
      <div className="mb-8">
        <CategoryFilter />
      </div>

      {/* Posts Grid */}
      {!posts?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">
            {searchParams.category
              ? `Keine Artikel in der Kategorie "${searchParams.category}" gefunden.`
              : "Noch keine Artikel veröffentlicht."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <BlogCard
              key={post.id}
              title={post.title}
              slug={post.slug}
              excerpt={post.excerpt}
              category={post.category}
              cover_image_url={post.cover_image_url}
              published_at={post.published_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}
