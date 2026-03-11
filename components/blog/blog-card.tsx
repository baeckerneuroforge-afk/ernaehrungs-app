import Link from "next/link";
import { Calendar } from "lucide-react";

interface Props {
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  cover_image_url: string | null;
  published_at: string | null;
}

export function BlogCard({ title, slug, excerpt, category, cover_image_url, published_at }: Props) {
  return (
    <Link href={`/blog/${slug}`} className="group block">
      <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        {cover_image_url && (
          <div className="aspect-[2/1] overflow-hidden bg-gray-100">
            <img
              src={cover_image_url}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            {category && (
              <span className="text-xs font-medium bg-primary-bg text-primary px-2.5 py-0.5 rounded-full">
                {category}
              </span>
            )}
            {published_at && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                {new Date(published_at).toLocaleDateString("de-DE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-gray-800 group-hover:text-primary transition mb-2 line-clamp-2">
            {title}
          </h2>
          {excerpt && (
            <p className="text-sm text-gray-500 line-clamp-3">
              {excerpt}
            </p>
          )}
          <span className="inline-block mt-3 text-sm font-medium text-primary group-hover:underline">
            Weiterlesen
          </span>
        </div>
      </article>
    </Link>
  );
}
