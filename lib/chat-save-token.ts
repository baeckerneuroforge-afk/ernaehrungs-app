import { createHmac, timingSafeEqual } from "crypto";

/**
 * HMAC tokens so /api/chat/save only accepts assistant content that the chat
 * route just produced. Prevents same-user history poisoning via crafted
 * assistant turns without a redesign of the client save flow.
 */

function secret(): string {
  // Prefer dedicated secret; fall back to Clerk secret (always present in prod).
  return (
    process.env.CHAT_SAVE_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.CRON_SECRET ||
    "dev-chat-save-insecure"
  );
}

export function createChatSaveToken(
  userId: string,
  sessionId: string,
  userMessage: string,
  assistantMessage: string
): string {
  const payload = `${userId}\n${sessionId}\n${userMessage}\n${assistantMessage}`;
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function verifyChatSaveToken(
  userId: string,
  sessionId: string,
  userMessage: string,
  assistantMessage: string,
  token: string | undefined | null
): boolean {
  if (!token || typeof token !== "string" || token.length < 32) return false;
  const expected = createChatSaveToken(
    userId,
    sessionId,
    userMessage,
    assistantMessage
  );
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(token, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
