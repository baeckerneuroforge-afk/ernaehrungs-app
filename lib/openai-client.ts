import OpenAI from "openai";

// Lazy module-level singleton (see lib/anthropic-client.ts for rationale).
// Adds a request timeout so a hanging embeddings/completion call can't block
// a route until the Vercel function timeout.
let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30_000,
      maxRetries: 2,
    });
  }
  return _client;
}
