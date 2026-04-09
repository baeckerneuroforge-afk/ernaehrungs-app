import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { ChatClient } from "@/components/chat/chat-client";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from("ea_profiles")
    .select("id, name, review_consent")
    .eq("user_id", userId)
    .limit(1);

  // No profile → do onboarding first
  if (!profile?.length) redirect("/onboarding");

  // Consent not yet answered → must respond before accessing chat
  if (profile[0]?.review_consent === null) redirect("/onboarding");

  return (
    <div className="h-[100dvh] flex flex-col bg-surface-bg">
      <Navbar />
      <ChatClient userId={userId} userName={profile[0]?.name || "du"} />
    </div>
  );
}
