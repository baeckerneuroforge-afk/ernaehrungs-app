import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Marks the onboarding walkthrough as completed (or resets it).
 * Body: { reset?: boolean } — pass true to re-enable the tour.
 * No credit cost.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let reset = false;
  try {
    const body = await request.json();
    reset = body?.reset === true;
  } catch {
    // no body → default completion
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("ea_profiles")
    .update({ onboarding_tour_done: !reset })
    .eq("user_id", userId);

  if (error) {
    console.error("[profile/tour-done] db error:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, reset }), {
    headers: { "Content-Type": "application/json" },
  });
}
