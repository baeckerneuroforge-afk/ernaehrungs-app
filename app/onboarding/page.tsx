import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("ea_profiles")
    .select("*")
    .eq("user_id", user.id)
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
      userId={user.id}
      existingProfile={p ?? null}
      initialStep={initialStep}
    />
  );
}
