export type Feature =
  | "chat"
  | "plan"
  | "review"
  | "tagebuch"
  | "tracker"
  | "janine_direkt"
  | "foto_tracking"
  | "chat_image"
  | "monthly_report"
  | "shopping_list"
  | "barcode_scanner";

export type SubscriptionPlan = "free" | "pro" | "pro_plus" | "admin";

const FEATURE_ACCESS: Record<SubscriptionPlan, Feature[]> = {
  free: ["chat", "tagebuch", "tracker"],
  pro: ["chat", "tagebuch", "tracker", "plan", "review", "shopping_list"],
  pro_plus: [
    "chat",
    "tagebuch",
    "tracker",
    "plan",
    "review",
    "shopping_list",
    "janine_direkt",
    "foto_tracking",
    "chat_image",
    "monthly_report",
    "barcode_scanner",
  ],
  admin: [
    "chat",
    "tagebuch",
    "tracker",
    "plan",
    "review",
    "shopping_list",
    "janine_direkt",
    "foto_tracking",
    "chat_image",
    "monthly_report",
    "barcode_scanner",
  ],
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
  if (
    feature === "janine_direkt" ||
    feature === "foto_tracking" ||
    feature === "chat_image" ||
    feature === "monthly_report" ||
    feature === "barcode_scanner"
  )
    return "pro_plus";
  if (feature === "plan" || feature === "review" || feature === "shopping_list")
    return "pro";
  return "free";
}

export function getUpgradeMessage(feature: Feature): string {
  const messages: Record<Feature, string> = {
    chat: "",
    tagebuch: "",
    tracker: "",
    plan: "Ernährungspläne sind ab dem Basis-Plan verfügbar. Upgrade um personalisierte Wochenpläne zu erhalten.",
    review: "Der Wochenreview ist ab dem Basis-Plan verfügbar. Upgrade um deine Fortschritte analysieren zu lassen.",
    shopping_list: "Die Einkaufsliste ist ab dem Basis-Plan verfügbar.",
    janine_direkt: "Direktnachrichten an Janine sind im Premium-Plan verfügbar.",
    foto_tracking: "Foto-Tracking ist im Premium-Plan verfügbar. Fotografiere deine Mahlzeit und lass die KI Kalorien und Makros schätzen.",
    chat_image: "Bild-Upload im Chat ist im Premium-Plan verfügbar. Fotografiere Speisekarten oder Essen und lass dich beraten.",
    monthly_report: "Monatliche Fortschrittsreports sind im Premium-Plan verfügbar.",
    barcode_scanner: "Der Barcode-Scanner ist im Premium-Plan verfügbar. Scanne Lebensmittel und erfasse Nährwerte automatisch.",
  };
  return messages[feature];
}
