import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { ChatClient } from "@/components/chat/chat-client";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("ea_profiles")
    .select("id, name, review_consent")
    .eq("user_id", user.id)
    .limit(1);

  // No profile → do onboarding first
  if (!profile?.length) redirect("/onboarding");

  // Consent not yet answered → must respond before accessing chat
  if (profile[0]?.review_consent === null) redirect("/onboarding");

  return (
    <div className="h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <ChatClient userId={user.id} userName={profile[0]?.name || "du"} />
    </div>
  );
}
