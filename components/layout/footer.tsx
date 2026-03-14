import Link from "next/link";
import { Leaf } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-warm-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-bg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-warm-dark">
              Ernährungsberatung by Janine
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/blog"
              className="text-sm text-warm-muted hover:text-primary transition"
            >
              Blog
            </Link>
            <Link
              href="#"
              className="text-sm text-warm-muted hover:text-primary transition"
            >
              Impressum
            </Link>
            <Link
              href="#"
              className="text-sm text-warm-muted hover:text-primary transition"
            >
              Datenschutz
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-warm-border">
          <p className="text-xs text-warm-light text-center">
            Diese App ersetzt keine ärztliche Beratung. Bei gesundheitlichen
            Beschwerden wende dich bitte an deinen Arzt oder deine Ärztin.
          </p>
        </div>
      </div>
    </footer>
  );
}
