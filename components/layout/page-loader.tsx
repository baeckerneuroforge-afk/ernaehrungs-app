import { Leaf } from "lucide-react";

/**
 * Centered pulsing leaf, used as the default app loading fallback
 * (see app/loading.tsx and route-level loading.tsx files).
 */
export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-surface-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-card animate-pulse">
          <Leaf className="w-6 h-6 text-white" />
        </div>
        <p className="text-xs text-ink-faint font-medium tracking-wide">Lädt …</p>
      </div>
    </div>
  );
}
