export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  alter_jahre: number | null;
  geschlecht: string | null;
  groesse_cm: number | null;
  gewicht_kg: number | null;
  ziel: string | null;
  allergien: string[];
  ernaehrungsform: string | null;
  krankheiten: string | null;
  aktivitaet: string | null;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  source: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  sources: { title: string; similarity: number }[] | null;
  created_at: string;
}

export const ZIELE = [
  { value: "abnehmen", label: "Abnehmen" },
  { value: "zunehmen", label: "Zunehmen" },
  { value: "halten", label: "Gewicht halten" },
  { value: "muskelaufbau", label: "Muskelaufbau" },
  { value: "gesuender", label: "Gesünder ernähren" },
] as const;

export const ALLERGIEN = [
  "Gluten",
  "Laktose",
  "Nüsse",
  "Soja",
  "Eier",
  "Fisch",
  "Fruktose",
  "Histamin",
] as const;

export const ERNAEHRUNGSFORMEN = [
  { value: "alles", label: "Alles (Mischkost)" },
  { value: "vegetarisch", label: "Vegetarisch" },
  { value: "vegan", label: "Vegan" },
  { value: "pescetarisch", label: "Pescetarisch" },
  { value: "keto", label: "Keto" },
  { value: "lowcarb", label: "Low-Carb" },
] as const;

export const AKTIVITAET = [
  { value: "wenig", label: "Wenig aktiv" },
  { value: "moderat", label: "Moderat aktiv" },
  { value: "aktiv", label: "Aktiv" },
  { value: "sehr_aktiv", label: "Sehr aktiv" },
] as const;

export const GESCHLECHT = [
  { value: "weiblich", label: "Weiblich" },
  { value: "maennlich", label: "Männlich" },
  { value: "divers", label: "Divers" },
] as const;

export interface WeightLog {
  id: string;
  user_id: string;
  gewicht_kg: number;
  notiz: string | null;
  gemessen_am: string;
  created_at: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  titel: string;
  zeitraum: string | null;
  inhalt?: string;
  profil_snapshot?: Record<string, unknown> | null;
  plan_data?: Record<string, unknown> | null;
  parameters?: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

export interface Ziel {
  id: string;
  user_id: string;
  typ: "gewicht" | "kalorien" | "custom";
  beschreibung: string;
  zielwert: number | null;
  startwert: number | null;
  einheit: string | null;
  zieldatum: string | null;
  erreicht: boolean;
  erreicht_am: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  user_id: string;
  role: "user" | "admin";
  created_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  mahlzeit_typ: "fruehstueck" | "mittag" | "abend" | "snack";
  beschreibung: string;
  kalorien_geschaetzt: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  uhrzeit: string | null;
  source: "manual" | "photo";
  photo_url: string | null;
  photo_feedback: "accurate" | "too_low" | "too_high" | null;
  photo_tip: string | null;
  photo_daily_budget_percent: number | null;
  datum: string;
  created_at: string;
}

export const MAHLZEIT_TYPEN = [
  { value: "fruehstueck", label: "Frühstück" },
  { value: "mittag", label: "Mittagessen" },
  { value: "abend", label: "Abendessen" },
  { value: "snack", label: "Snack" },
] as const;

export interface ChatSession {
  session_id: string;
  title: string | null;
  started_at: string;
  last_message_at: string;
  message_count: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  category: string | null;
  meta_description: string | null;
  cover_image_url: string | null;
  status: "draft" | "published";
  in_wissensbasis: boolean;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export const BLOG_CATEGORIES = [
  "Grundlagen",
  "Rezepte",
  "Tipps",
  "Ernährungsformen",
  "Nährstoffe",
] as const;
