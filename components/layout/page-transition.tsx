"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps children in a fade-up animation that replays on every route change.
 * Keyed on pathname so React unmounts + remounts the inner div, restarting
 * the CSS animation defined in globals.css (.page-transition).
 * Respects prefers-reduced-motion via the CSS rule.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
