"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BLOG_CATEGORIES } from "@/types";

export function CategoryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  function handleFilter(category: string | null) {
    if (category) {
      router.push(`/blog?category=${encodeURIComponent(category)}`);
    } else {
      router.push("/blog");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => handleFilter(null)}
        className={`px-3.5 py-1.5 rounded-full text-sm transition ${
          !activeCategory
            ? "bg-primary text-white"
            : "bg-white text-gray-600 border border-gray-200 hover:border-primary/30"
        }`}
      >
        Alle
      </button>
      {BLOG_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => handleFilter(cat)}
          className={`px-3.5 py-1.5 rounded-full text-sm transition ${
            activeCategory === cat
              ? "bg-primary text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:border-primary/30"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
