import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-warm-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <span className="text-sm font-medium text-warm-dark">
            Ernährungsberatung by Janine
          </span>
          <div className="flex items-center gap-6">
            <Link href="/impressum" className="text-sm text-warm-muted hover:text-warm-dark transition">
              Impressum
            </Link>
            <Link href="/datenschutz" className="text-sm text-warm-muted hover:text-warm-dark transition">
              Datenschutz
            </Link>
            <Link href="/agb" className="text-sm text-warm-muted hover:text-warm-dark transition">
              AGB
            </Link>
            <Link href="/blog" className="text-sm text-warm-muted hover:text-warm-dark transition">
              Blog
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
