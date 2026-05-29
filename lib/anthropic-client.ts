import Anthropic from "@anthropic-ai/sdk";

// Lazy module-level singleton. Avoids re-instantiating the SDK (and re-parsing
// config) on every request, and applies a request timeout + retries so a
// hanging Anthropic call can't block a route until the Vercel function timeout.
// Lazy (not top-level) so a missing key at build/import time doesn't crash.
let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30_000,
      maxRetries: 2,
    });
  }
  return _client;
}
