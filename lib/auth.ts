import { auth } from "@clerk/nextjs/server";

/**
 * Require authenticated user. Throws if not logged in.
 * Use in API routes and server components.
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

/**
 * Get user ID if logged in, null otherwise.
 * Use when auth is optional (e.g. public pages that show different content for logged-in users).
 */
export async function getOptionalAuth(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}
