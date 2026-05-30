import { randomUUID } from "node:crypto";

import { createSupabaseAdmin } from "@/lib/supabase/server";

export type UsagePlan = "free" | "pro" | "pro_plus" | "admin";

export type UsageLogParams = {
  userId: string | null;
  plan: UsagePlan;
  endpoint: string;
  action: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  imageTokensEstimate?: number;
  embeddingTokens?: number;
  creditsCharged?: number;
  creditsRefunded?: boolean;
  requestId?: string;
  error?: string;
  durationMs?: number;
};

type ModelPricing = {
  input: number;
  output: number;
  cacheReadMultiplier?: number;
  cacheWriteMultiplier?: number;
};

export type UsageTokenFields = Pick<
  UsageLogParams,
  "inputTokens" | "outputTokens" | "cacheReadTokens" | "cacheWriteTokens"
>;

export const USD_TO_EUR = 0.85;

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0, cacheReadMultiplier: 0.1, cacheWriteMultiplier: 1.25 },
  "claude-opus-4-7": { input: 5.0, output: 25.0, cacheReadMultiplier: 0.1, cacheWriteMultiplier: 1.25 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0, cacheReadMultiplier: 0.1, cacheWriteMultiplier: 1.25 },
  "openai-text-embedding-3-small": { input: 0.02, output: 0 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
};

export function createUsageRequestId(): string {
  return randomUUID();
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateImageTokensFromBytes(byteLength: number): number {
  if (!Number.isFinite(byteLength) || byteLength <= 0) return 0;
  return Math.ceil(byteLength / 750);
}

export function estimateImageTokensFromBase64(base64: string): number {
  const normalizedLength = base64.replace(/^data:[^,]+,/, "").length;
  return estimateImageTokensFromBytes(Math.ceil((normalizedLength * 3) / 4));
}

export function extractAnthropicUsage(usage: unknown): UsageTokenFields {
  const value = usage && typeof usage === "object" ? (usage as Record<string, unknown>) : {};

  return {
    inputTokens: toNonNegativeInt(value.input_tokens),
    outputTokens: toNonNegativeInt(value.output_tokens),
    cacheReadTokens: toNonNegativeInt(value.cache_read_input_tokens),
    cacheWriteTokens: toNonNegativeInt(value.cache_creation_input_tokens),
  };
}

export function extractOpenAIEmbeddingTokens(response: unknown, fallbackText?: string): number {
  const value = response && typeof response === "object" ? (response as Record<string, unknown>) : {};
  const usage = value.usage && typeof value.usage === "object" ? (value.usage as Record<string, unknown>) : {};
  const totalTokens = toNonNegativeInt(usage.total_tokens);

  if (totalTokens > 0) {
    return totalTokens;
  }

  return fallbackText ? estimateTokens(fallbackText) : 0;
}

export function normalizeUsagePlan(plan: string | null | undefined): UsagePlan {
  if (plan === "pro" || plan === "pro_plus" || plan === "admin") {
    return plan;
  }

  return "free";
}

export async function logUsage(params: UsageLogParams): Promise<void> {
  try {
    const { costUsd, costEur } = calculateCost(params);
    const supabase = createSupabaseAdmin();

    const { error } = await supabase.from("ea_ai_usage").insert({
      user_id: params.userId,
      plan: params.plan,
      endpoint: params.endpoint,
      action: params.action,
      model: params.model,
      input_tokens: toNonNegativeInt(params.inputTokens),
      output_tokens: toNonNegativeInt(params.outputTokens),
      cache_read_tokens: toNonNegativeInt(params.cacheReadTokens),
      cache_write_tokens: toNonNegativeInt(params.cacheWriteTokens),
      image_tokens_estimate: toNonNegativeInt(params.imageTokensEstimate),
      embedding_tokens: toNonNegativeInt(params.embeddingTokens),
      cost_usd: costUsd,
      cost_eur: costEur,
      credits_charged: params.creditsCharged ?? 0,
      credits_refunded: params.creditsRefunded ?? false,
      request_id: params.requestId ?? createUsageRequestId(),
      error: params.error?.slice(0, 2000) ?? null,
      duration_ms: params.durationMs ?? null,
    });

    if (error) {
      console.error("[usage-logging] insert failed", error.message);
    }
  } catch (error) {
    console.error("[usage-logging] failed", error);
  }
}

function calculateCost(params: UsageLogParams): { costUsd: number; costEur: number } {
  const pricing = MODEL_PRICING[params.model] ?? { input: 0, output: 0 };
  const inputTokens = toNonNegativeInt(params.inputTokens);
  const outputTokens = toNonNegativeInt(params.outputTokens);
  const imageTokensEstimate = toNonNegativeInt(params.imageTokensEstimate);
  const cacheReadTokens = toNonNegativeInt(params.cacheReadTokens);
  const cacheWriteTokens = toNonNegativeInt(params.cacheWriteTokens);
  const embeddingTokens = toNonNegativeInt(params.embeddingTokens);
  const isEmbeddingModel = params.model.includes("embedding");
  const billableInputTokens = inputTokens > 0 ? inputTokens : isEmbeddingModel ? embeddingTokens : imageTokensEstimate;

  const inputCost = (billableInputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const cacheReadCost =
    (cacheReadTokens / 1_000_000) * pricing.input * (pricing.cacheReadMultiplier ?? 1);
  const cacheWriteCost =
    (cacheWriteTokens / 1_000_000) * pricing.input * (pricing.cacheWriteMultiplier ?? 1);
  const embeddingCost = isEmbeddingModel
    ? 0
    : (embeddingTokens / 1_000_000) * (MODEL_PRICING["openai-text-embedding-3-small"]?.input ?? 0);
  const costUsd = inputCost + outputCost + cacheReadCost + cacheWriteCost + embeddingCost;

  return {
    costUsd: roundCost(costUsd),
    costEur: roundCost(costUsd * USD_TO_EUR),
  };
}

function roundCost(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(8));
}

function toNonNegativeInt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}
