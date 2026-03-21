export type ActionType = "chat" | "plan_generation";

const PLAN_PATTERNS = [
  /ern[äa]hrungsplan/i,
  /wochenplan/i,
  /tagesplan/i,
  /essensplan/i,
  /meal.?plan/i,
  /erstell.{0,20}plan/i,
  /generier.{0,20}plan/i,
  /plan.{0,20}erstell/i,
  /plan.{0,20}generier/i,
  /plan.{0,20}f[üu]r.{0,20}(woche|tag|monat)/i,
];

/**
 * Classify a user message to determine the action type and associated credit cost.
 * Plan generation costs more credits than regular chat.
 */
export function classifyAction(message: string): ActionType {
  if (PLAN_PATTERNS.some((p) => p.test(message))) {
    return "plan_generation";
  }
  return "chat";
}
