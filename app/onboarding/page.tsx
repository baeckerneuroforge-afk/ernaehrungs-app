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

  const { data: profile } = await supabase
    .from("ea_profiles")
    .select("*")
    .eq("user_id", userId)
    .limit(1);

  const p = profile?.[0];

  // Onboarding complete → go to chat. Consent questions (steps 4-5) are
  // only shown during the initial onboarding flow — returning users who
  // missed consent are NOT forced back here. Consent can be managed in
  // settings or asked as a non-blocking prompt in the app later.
  if (p?.onboarding_done) {
    redirect("/chat");
  }

  const initialStep = 1;

  return (
    <OnboardingWizard
      userId={userId}
      existingProfile={p ?? null}
      initialStep={initialStep}
    />
  );
}
