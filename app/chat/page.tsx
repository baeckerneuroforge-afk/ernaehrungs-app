import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { ChatClient } from "@/components/chat/chat-client";
import { Walkthrough } from "@/components/onboarding/walkthrough";
import { isAdminUser } from "@/lib/credits";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from("ea_profiles")
    .select("id, name, review_consent, onboarding_tour_done")
    .eq("user_id", userId)
    .limit(1);

  // No profile → do onboarding first
  if (!profile?.length) redirect("/onboarding");

  // Consent not yet answered → must respond before accessing chat
  if (profile[0]?.review_consent === null) redirect("/onboarding");

  const tourDone = profile[0]?.onboarding_tour_done === true;

  // Fetch plan for plan-gated step text
  let plan = "free";
  if (await isAdminUser(userId)) {
    plan = "admin";
  } else {
    const { data: userRow } = await supabase
      .from("ea_users")
      .select("subscription_plan")
      .eq("clerk_id", userId)
      .limit(1);
    plan = (userRow?.[0]?.subscription_plan as string) || "free";
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-surface-bg">
      <Navbar />
      <ChatClient userId={userId} userName={profile[0]?.name || "du"} />
      {!tourDone && <Walkthrough userPlan={plan} />}
    </div>
  );
}
