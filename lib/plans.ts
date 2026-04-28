// Client-safe plan + credit constants. Lives separately from lib/credits.ts
// so client components can import these without pulling in server-only deps
// (resend, supabase admin, etc.) via the credits module's tree.

// Credit costs per action
export const CREDIT_COSTS = {
  chat_usage: 1, // Haiku (Free/Basis)
  chat_usage_premium: 2, // Sonnet (Premium/Admin) — bessere Qualität
  chat_image: 3, // Chat mit Bild (Opus 4.7 Vision) — Premium only
  plan_generation: 5,
  review: 4, // Wochenreview (Opus 4.7)
  foto_analysis: 3, // Opus 4.7 Vision
  monthly_report: 7, // Monatsreport (Opus 4.7)
  smart_log: 2, // Free-Text → Tagebuch-Einträge parsen (Haiku)
} as const;

// Credits granted per plan per month
export const PLAN_CREDITS = {
  free: 15,
  pro: 60,
  pro_plus: 250,
} as const;

// Monthly plan prices in EUR (for display only — source of truth is Stripe)
export const PLAN_PRICES = {
  free: 0,
  pro: 15.99,
  pro_plus: 49.99,
} as const;

export const PLAN_LABELS = {
  free: "Free",
  pro: "Basis",
  pro_plus: "Premium",
  admin: "Admin",
} as const;
