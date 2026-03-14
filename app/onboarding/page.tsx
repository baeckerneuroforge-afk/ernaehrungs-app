import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from("ea_profiles")
    .select("*")
    .eq("user_id", userId)
    .limit(1);

  const p = profile?.[0];

  // Onboarding complete + consent answered → go to chat
  if (p?.onboarding_done && p?.review_consent !== null) {
    redirect("/chat");
  }

  // Onboarding complete but consent not yet answered → show only consent step
  const initialStep = p?.onboarding_done && p?.review_consent === null ? 4 : 1;

  return (
    <OnboardingWizard
      userId={userId}
      existingProfile={p ?? null}
      initialStep={initialStep}
    />
  );
}
