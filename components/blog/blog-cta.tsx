import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

export function BlogCta() {
  return (
    <section className="bg-gradient-to-br from-primary to-primary-light rounded-2xl p-8 sm:p-12 text-center text-white mt-12">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
          <Leaf className="w-6 h-6 text-white" />
        </div>
      </div>
      <h2 className="text-xl sm:text-2xl font-bold mb-2">
        Hast du eine Ernährungsfrage?
      </h2>
      <p className="text-white/80 text-sm sm:text-base mb-6 max-w-md mx-auto">
        Unsere KI-Beraterin antwortet dir sofort – fundiert und persönlich, basierend auf echtem Fachwissen.
      </p>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition text-sm"
      >
        Kostenlos starten
        <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}
