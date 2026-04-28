"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertCircle, X, Sparkles } from "lucide-react";

/**
 * Global warning banner shown at the top of the app (below the navbar)
 * when the user's credits run low. Dismissable per-session via
 * sessionStorage — reappears on next session.
 */
export function CreditWarning() {
  const pathname = usePathname() ?? "";
  const [total, setTotal] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Don't render on marketing / auth / onboarding routes
  const hiddenRoutes = ["/", "/sign-in", "/sign-up", "/onboarding", "/impressum", "/datenschutz", "/agb", "/blog"];
  const isHidden =
    pathname === "/" ||
    hiddenRoutes.some((r) => r !== "/" && (pathname === r || pathname.startsWith(r + "/"))) ||
    pathname.startsWith("/admin");

  useEffect(() => {
    if (isHidden) return;
    if (typeof window !== "undefined") {
      setDismissed(sessionStorage.getItem("credit-warning-dismissed") === "1");
    }
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.total === "number") setTotal(data.total);
      })
      .catch(() => {});
  }, [isHidden, pathname]);

  function handleDismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("credit-warning-dismissed", "1");
    }
  }

  if (isHidden || dismissed || total === null) return null;
  if (total > 5) return null;

  const isEmpty = total <= 0;

  return (
    <div
      className={`${
        isEmpty ? "bg-orange-50 border-orange-200" : "bg-yellow-50 border-yellow-200"
      } border-b px-4 py-2.5 animate-fade-in`}
    >
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <AlertCircle
          className={`w-4 h-4 flex-shrink-0 ${isEmpty ? "text-orange-600" : "text-yellow-700"}`}
        />
        <p
          className={`text-xs sm:text-sm flex-1 leading-snug ${
            isEmpty ? "text-orange-800" : "text-yellow-900"
          }`}
        >
          {isEmpty ? (
            <span>
              <span className="font-medium">Deine Credits sind aufgebraucht.</span> Upgrade oder lade Credits nach, um weiterzumachen.
            </span>
          ) : (
            <span>
              Du hast noch <span className="font-medium">{total} Credit{total === 1 ? "" : "s"}</span>. Upgrade für mehr Möglichkeiten.
            </span>
          )}
        </p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isEmpty ? (
            <>
              <Link
                href="/#preise"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-medium bg-primary text-white rounded-full px-3 py-1.5 hover:bg-primary-hover transition"
              >
                <Sparkles className="w-3 h-3" />
                Plan upgraden
              </Link>
              <Link
                href="/profil"
                className="text-xs font-medium text-ink hover:text-primary px-2 py-1.5 rounded-full hover:bg-white/50 transition"
              >
                Credits nachkaufen
              </Link>
            </>
          ) : (
            <Link
              href="/#preise"
              className="text-xs font-medium text-ink hover:text-primary px-3 py-1.5 rounded-full bg-white/60 hover:bg-white transition"
            >
              Pläne ansehen
            </Link>
          )}
          <button
            onClick={handleDismiss}
            className={`p-1 rounded-full transition ${
              isEmpty ? "text-orange-700 hover:bg-orange-100" : "text-yellow-800 hover:bg-yellow-100"
            }`}
            aria-label="Schließen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
