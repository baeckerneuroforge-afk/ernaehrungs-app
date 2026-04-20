import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { OnboardingSessionGate } from "@/components/onboarding/session-gate";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { userId } = await auth();

  // Fresh sign-ups (especially email+code flow) can land here before the
  // Clerk session cookie is fully propagated to the server. Instead of
  // immediately bouncing to /sign-in we render a client-side gate that
  // waits a few seconds and does a hard reload — usually enough for the
  // cookie to catch up. If it really is a logged-out user, the gate
  // eventually sends them to /sign-in.
  if (!userId) {
    return <OnboardingSessionGate />;
  }

  const supabase = createSupabaseAdmin();

  // Pull both tables in parallel. ea_users holds AGB + ki_consent;
  // ea_profiles holds the nutrition data + review_consent + the final
  // completion flag.
  const [userRes, profileRes] = await Promise.all([
    supabase
      .from("ea_users")
      .select("agb_accepted_at, ki_consent")
      .eq("clerk_id", userId)
      .maybeSingle(),
    supabase
      .from("ea_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const user = userRes.data;
  const p = profileRes.data;

  // Fully onboarded → straight to home.
  if (p?.onboarding_done) {
    redirect("/home");
  }

  // Partial onboarding resume: figure out the right step so users who closed
  // the tab after step 3 land on step 4 (KI consent), after step 4 on
  // step 5 (review consent). Never skip; never restart.
  let initialStep: 1 | 2 | 3 | 4 | 5 = 1;
  const kiConsentAnswered =
    user?.ki_consent === true || user?.ki_consent === false;
  const reviewConsentAnswered =
    p?.review_consent === true || p?.review_consent === false;

  if (!p || !user?.agb_accepted_at) {
    initialStep = 1;
  } else if (!kiConsentAnswered) {
    initialStep = 4;
  } else if (!reviewConsentAnswered) {
    initialStep = 5;
  } else {
    // All prerequisites satisfied but onboarding_done still false — show
    // the final confirmation so the flag gets set via the wizard's finish
    // handler rather than silently promoting them to /home.
    initialStep = 5;
  }

  return (
    <OnboardingWizard
      userId={userId}
      existingProfile={p ?? null}
      initialStep={initialStep}
    />
  );
}
