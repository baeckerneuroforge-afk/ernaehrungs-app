export type Feature =
  | "chat"
  | "plan"
  | "review"
  | "tagebuch"
  | "tracker"
  | "janine_direkt";

export type SubscriptionPlan = "free" | "pro" | "pro_plus" | "admin";

const FEATURE_ACCESS: Record<SubscriptionPlan, Feature[]> = {
  free: ["chat", "tagebuch", "tracker"],
  pro: ["chat", "tagebuch", "tracker", "plan", "review"],
  pro_plus: ["chat", "tagebuch", "tracker", "plan", "review", "janine_direkt"],
  admin: ["chat", "tagebuch", "tracker", "plan", "review", "janine_direkt"],
};

export function hasFeatureAccess(
  plan: string | null | undefined,
  feature: Feature
): boolean {
  if (plan === "admin") return true;
  const normalized = (plan || "free") as SubscriptionPlan;
  return (FEATURE_ACCESS[normalized] || FEATURE_ACCESS.free).includes(feature);
}

export function requiredPlanFor(feature: Feature): SubscriptionPlan {
  if (feature === "janine_direkt") return "pro_plus";
  if (feature === "plan" || feature === "review") return "pro";
  return "free";
}

export function getUpgradeMessage(feature: Feature): string {
  const messages: Record<Feature, string> = {
    chat: "",
    tagebuch: "",
    tracker: "",
    plan: "Ernährungspläne sind ab dem Basis-Plan verfügbar. Upgrade um personalisierte Wochenpläne zu erhalten.",
    review: "Der Wochenreview ist ab dem Basis-Plan verfügbar. Upgrade um deine Fortschritte analysieren zu lassen.",
    janine_direkt: "Direktnachrichten an Janine sind im Premium-Plan verfügbar.",
  };
  return messages[feature];
}
