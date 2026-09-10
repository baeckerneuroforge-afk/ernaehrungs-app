export type ActionType = "chat" | "plan_generation" | "review";

// Intentional narrow patterns: only clear *requests to generate* a plan or
// weekly review. Casual mentions ("was ist ein Ernährungsplan?", "mein Fortschritt")
// stay regular chat so we don't bill 4–5 credits for ordinary questions.
const PLAN_PATTERNS = [
  // "Erstelle mir einen Ernährungsplan" / "Erstell mir bitte einen Wochenplan"
  /erstell\w*\b.{0,40}\b(ern[äa]hrungs|wochen|tages|essens)?plan\b/i,
  /generier\w*\b.{0,40}\b(ern[äa]hrungs|wochen|meal)?plan\b/i,
  /\b(ern[äa]hrungs|wochen|tages|essens)plan\b.{0,30}\b(erstell|generier|mach|bauen)/i,
  /meal\s*plan\s+(for|please|erstell|generier)/i,
  /mach\w*\b.{0,30}\b(ern[äa]hrungs|wochen)plan\b/i,
];

const REVIEW_PATTERNS = [
  /wochenreview/i,
  /wochencheck/i,
  /wochenr[üu]ckblick/i,
  /erstell(e|t|en)?\s+(mir\s+)?(einen\s+|meinen\s+)?(wochen)?(review|r[üu]ckblick)/i,
  /mach(e|t)?\s+(mir\s+)?(einen\s+|meinen\s+)?wochenr[üu]ckblick/i,
  /wie war meine woche/i,
  /analyse meiner woche/i,
  /analysier(e|t|en)?\s+meine\s+woche/i,
];

/**
 * Classify a user message to determine the action type and associated credit cost.
 * Plan generation and review cost more credits than regular chat.
 */
export function classifyAction(message: string): ActionType {
  if (PLAN_PATTERNS.some((p) => p.test(message))) {
    return "plan_generation";
  }
  if (REVIEW_PATTERNS.some((p) => p.test(message))) {
    return "review";
  }
  return "chat";
}
