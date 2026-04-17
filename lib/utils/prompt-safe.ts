/**
 * Sanitize a user-controlled string before inlining it into an LLM system
 * prompt. Defense against prompt injection.
 *
 * Strategy:
 *   1) Trim and cap length (per-field — longer limits are passed explicitly).
 *   2) Collapse excessive whitespace/newlines.
 *   3) Neutralize lines that look like instruction hijack attempts at the
 *      start of the text ("Ignore previous…", "System:", role-impersonation,
 *      markdown-injected headers like `### SYSTEM`).
 *   4) Keep the original semantics readable for the model — we do not
 *      scrub data, just soften obvious injection patterns.
 *
 * This is belt-and-suspenders on top of proper prompt framing: user input
 * is still always wrapped in quotes and preceded by a field label so the
 * model knows it is data, not instructions.
 */
export function sanitizeForPrompt(
  text: string | null | undefined,
  options: { maxLen?: number } = {}
): string {
  if (!text) return "";
  const maxLen = options.maxLen ?? 500;

  // 1. Trim + length cap
  let out = String(text).trim().slice(0, maxLen);

  // 2. Collapse runs of newlines / whitespace
  out = out.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{3,}/g, "  ");

  // 3. Neutralize obvious hijack-prefixes on any line.
  //    We replace them with `[filtered]` but keep the rest of the line.
  const hijackPatterns = [
    /^\s*(ignore|vergiss|forget)\b[^\n]*/gim,
    /^\s*(system|assistant|human|user)\s*:/gim,
    /^\s*\[(system|assistant|human|user)\][^\n]*/gim,
    /^\s*#+\s*(system|assistant|human|user)\b[^\n]*/gim,
    /^\s*(du bist jetzt|you are now|act as|pretend to be)\b[^\n]*/gim,
  ];
  for (const re of hijackPatterns) {
    out = out.replace(re, "[filtered]");
  }

  return out;
}

/**
 * Quote a user field so the model sees it as a string literal, not a
 * continuation of the system instructions. Use together with sanitizeForPrompt.
 */
export function quoteField(text: string | null | undefined, maxLen = 500): string {
  const safe = sanitizeForPrompt(text, { maxLen });
  return safe ? `"${safe.replace(/"/g, "'")}"` : '""';
}
