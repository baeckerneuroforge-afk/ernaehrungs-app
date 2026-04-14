import Link from "next/link";
import { Leaf } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-bg px-4">
      <div className="text-center space-y-5 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
          <Leaf className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-serif text-3xl font-semibold text-ink">
          Seite nicht gefunden
        </h1>
        <p className="text-ink-muted">
          Die Seite, die du suchst, existiert leider nicht oder wurde verschoben.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-primary text-white px-6 py-3 font-medium hover:bg-primary-hover transition-colors shadow-card"
        >
          Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
