import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Ensures the caller is (a) signed in, (b) has a complete profile with all
 * required consents recorded (DSGVO Art. 6/7). Redirects otherwise.
 *
 * Returns the Clerk `userId` on success so the calling Server Component can
 * continue without another `auth()` round-trip.
 *
 * Use at the top of every protected Server Component page
 * (/home, /tagebuch, /tracker, /ernaehrungsplan, /billing, /reports,
 *  /einstellungen, /profil, /scanner):
 *
 *   export default async function Page() {
 *     const userId = await requireOnboardedUser();
 *     // ...
 *   }
 */
export async function requireOnboardedUser(): Promise<string> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = createSupabaseAdmin();

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
  const kiConsentAnswered =
    user?.ki_consent === true || user?.ki_consent === false;
  const reviewConsentAnswered =
    profile?.review_consent === true || profile?.review_consent === false;
  const onboardingDone = profile?.onboarding_done === true;

  const needsOnboarding =
    !hasProfile ||
    !hasAgb ||
    !kiConsentAnswered ||
    !reviewConsentAnswered ||
    !onboardingDone;

  if (needsOnboarding) redirect("/onboarding");

  return userId;
}
