"use client";

// Dedupliziert den /api/credits-Fan-out (P10): CreditWarning, Navbar und
// ChatClient holen die Credits beim Mount gleichzeitig — ohne Cache waeren das
// 3 parallele Requests (je auth + isAdminUser + getCredits). Ein kurzlebiger
// Promise-Cache macht daraus EINEN Request. invalidate() nach Topup/Verbrauch.
type CreditsResponse = {
  total: number;
  credits_subscription: number;
  credits_topup: number;
  plan: string;
  plan_limit: number;
  isAdmin: boolean;
};

const TTL_MS = 5000;
let cached: { at: number; promise: Promise<CreditsResponse | null> } | null = null;

export function fetchCreditsShared(): Promise<CreditsResponse | null> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.promise;
  const promise = fetch("/api/credits")
    .then((r) => (r.ok ? (r.json() as Promise<CreditsResponse>) : null))
    .catch(() => null);
  cached = { at: now, promise };
  return promise;
}

export function invalidateCreditsCache(): void {
  cached = null;
}
