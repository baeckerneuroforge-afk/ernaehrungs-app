import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod input schemas for every public API route. We run these at the very
// start of the handler (after auth) so a malformed payload can't slip into
// the DB or into an LLM call.
// ---------------------------------------------------------------------------

// Profil
export const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  alter_jahre: z.number().int().min(10).max(120).optional(),
  geschlecht: z.enum(["maennlich", "weiblich", "divers"]).optional(),
  groesse_cm: z.number().int().min(100).max(250).optional().nullable(),
  gewicht_kg: z.number().min(20).max(300).optional().nullable(),
  ziel: z.string().max(200).optional(),
  ernaehrungsform: z.string().max(100).optional(),
  allergien: z.array(z.string()).optional(),
  aktivitaet: z.string().max(50).optional(),
  krankheiten: z.string().max(500).optional().nullable(),
  onboarding_done: z.boolean().optional(),
  agb_accepted: z.boolean().optional(),
  target_weight: z.number().min(30).max(300).optional().nullable(),
  target_timeframe: z
    .enum(["3_months", "6_months", "9_months", "12_months", "no_rush"])
    .optional(),
});

// Chat
export const chatMessageSchema = z.object({
  message: z.string().min(1).max(10000).optional(),
  conversationId: z.string().uuid().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
  image: z
    .object({
      base64: z.string().max(15000000),
      mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    })
    .optional()
    .nullable(),
});

// Ernährungsplan — actual wire format is { planParameters: {...} } where
// planParameters matches types/meal-plan.ts#PlanParameters.
export const planParametersSchema = z.object({
  fasting: z.string().max(50),
  mealsPerDay: z.number().int().min(1).max(6),
  timing: z.record(z.string(), z.string().max(10)),
  flexibleTiming: z.boolean(),
  mealprep: z.boolean(),
  mealPrepDays: z.number().int().min(0).max(7).optional(),
  periodicEatDays: z.number().int().min(0).max(30).optional(),
  periodicFastDays: z.number().int().min(0).max(30).optional(),
  userMessage: z.string().max(1000).optional(),
});

export const mealPlanRequestSchema = z.object({
  planParameters: planParametersSchema,
});

// Tagebuch
export const foodLogSchema = z.object({
  mahlzeit_typ: z.enum(["fruehstueck", "mittag", "abend", "snack"]),
  beschreibung: z.string().min(1).max(1000),
  kalorien_geschaetzt: z.number().int().min(0).max(10000).optional().nullable(),
  datum: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  uhrzeit: z.string().optional().nullable(),
  protein_g: z.number().min(0).max(1000).optional().nullable(),
  carbs_g: z.number().min(0).max(1000).optional().nullable(),
  fat_g: z.number().min(0).max(1000).optional().nullable(),
  portion: z.string().max(200).optional().nullable(),
  source: z.enum(["manual", "photo"]).optional(),
  photo_url: z.string().url().optional().nullable(),
  photo_confidence: z
    .enum(["sicher", "mittel", "unsicher"])
    .optional()
    .nullable(),
  photo_tip: z.string().max(500).optional().nullable(),
  photo_daily_budget_percent: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
});

// Gewicht — wire format uses gewicht_kg/gemessen_am (matches DB columns).
export const weightLogSchema = z.object({
  gewicht_kg: z.number().min(20).max(400),
  notiz: z.string().max(500).optional().nullable(),
  gemessen_am: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// Support
export const supportTicketSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(20).max(5000),
});

// Consent — type is optional for backwards compat: undefined → review.
export const consentSchema = z.object({
  consent: z.boolean(),
  type: z.enum(["ki", "review"]).optional(),
});

// Settings
export const settingsSchema = z.object({
  notification_preferences: z
    .object({
      tagebuch_reminder: z
        .object({
          enabled: z.boolean(),
          time: z.string().optional(),
        })
        .optional(),
      review_reminder: z
        .object({
          enabled: z.boolean(),
        })
        .optional(),
      credit_warning_email: z
        .object({
          enabled: z.boolean(),
        })
        .optional(),
    })
    .optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

// ---------------------------------------------------------------------------
// Thin wrapper: callers get a discriminated union instead of throws so the
// route handler stays readable.
// ---------------------------------------------------------------------------
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join(", "),
    };
  }
  return { success: true, data: result.data };
}
