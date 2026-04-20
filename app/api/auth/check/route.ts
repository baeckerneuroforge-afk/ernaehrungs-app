import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/check
 *
 * Polled by /auth-callback and /onboarding's session-gate to (a) confirm
 * that the Clerk session cookie has propagated to the server and (b)
 * decide whether the user still needs to finish onboarding.
 *
 * Response shape:
 *   { signedIn: boolean, hasProfile, hasAgb, hasKiConsent,
 *     hasReviewConsent, onboardingDone, needsOnboarding }
 *
 * `needsOnboarding` is the single boolean the client should act on:
 *   true  → redirect to /onboarding
 *   false → redirect to /home
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    // 200 (not 401): this is a legitimate "not yet signed in" state that
    // the poller needs to detect to retry. A 401 would be indistinguishable
    // from a true auth failure and trip the poller's error path.
    return new Response(
      JSON.stringify({
        signedIn: false,
        hasProfile: false,
        hasAgb: false,
        kiConsentAnswered: false,
        reviewConsentAnswered: false,
        onboardingDone: false,
        needsOnboarding: false,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const supabase = createSupabaseAdmin();

  // Load both tables in parallel.  ea_users holds agb_accepted_at + ki_consent
  // (DSGVO Art. 7 consent record), ea_profiles holds the nutrition profile
  // plus review_consent + onboarding_done (UI completion flag).
  const [userRes, profileRes] = await Promise.all([
    supabase
      .from("ea_users")
      .select("agb_accepted_at, ki_consent")
      .eq("clerk_id", userId)
      .maybeSingle(),
    supabase
      .from("ea_profiles")
      .select("id, onboarding_done, review_consent")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const user = userRes.data;
  const profile = profileRes.data;

  const hasProfile = !!profile;
  const hasAgb = !!user?.agb_accepted_at;
  // "Answered" means the question has been shown and the user picked something
  // (true or false). A null value means they never saw step 4/5.
  const kiConsentAnswered =
    user?.ki_consent === true || user?.ki_consent === false;
  const reviewConsentAnswered =
    profile?.review_consent === true || profile?.review_consent === false;
  const onboardingDone = profile?.onboarding_done === true;

  // Onboarding is complete only when ALL of:
  //   - profile row exists
  //   - AGB accepted
  //   - KI consent question answered (true or false — null means not shown)
  //   - review_consent question answered
  //   - onboarding_done flag is set (final explicit completion)
  // Missing any of these → force /onboarding.
  const needsOnboarding =
    !hasProfile ||
    !hasAgb ||
    !kiConsentAnswered ||
    !reviewConsentAnswered ||
    !onboardingDone;

  return NextResponse.json(
    {
      signedIn: true,
      hasProfile,
      hasAgb,
      kiConsentAnswered,
      reviewConsentAnswered,
      onboardingDone,
      needsOnboarding,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
