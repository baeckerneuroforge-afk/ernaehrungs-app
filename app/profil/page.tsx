import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProfilForm } from "@/components/profil/profil-form";
import { DangerZone } from "@/components/profil/danger-zone";
import { AlertTriangle } from "lucide-react";
import { isAdminUser, PLAN_CREDITS } from "@/lib/credits";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from("ea_profiles")
    .select("*")
    .eq("user_id", userId)
    .limit(1);

  const { data: userRow } = await supabase
    .from("ea_users")
    .select("subscription_plan, credits_subscription, credits_topup")
    .eq("clerk_id", userId)
    .limit(1);

  const displayName =
    (profile?.[0]?.name as string) ||
    user?.firstName ||
    user?.username ||
    "Willkommen";

  const isAdmin = await isAdminUser(userId);
  const plan = isAdmin
    ? "admin"
    : ((userRow?.[0]?.subscription_plan || "free") as
        | "free"
        | "pro"
        | "pro_plus");

  const creditsSub = userRow?.[0]?.credits_subscription ?? 0;
  const creditsTopup = userRow?.[0]?.credits_topup ?? 0;
  const total = isAdmin ? -1 : creditsSub + creditsTopup;
  const planLimit = isAdmin
    ? -1
    : PLAN_CREDITS[plan as keyof typeof PLAN_CREDITS] ?? PLAN_CREDITS.free;
  const credits = { used: Math.max(planLimit - creditsSub, 0), total: planLimit };

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 w-full pb-bottom-nav">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-ink">Dein Profil</h1>
          <p className="text-ink-muted mt-1 text-sm">
            Diese Informationen helfen uns, dir bessere und persönlichere
            Empfehlungen zu geben.
          </p>
        </div>

        <ProfilForm
          existingProfile={profile?.[0] || null}
          imageUrl={user?.imageUrl ?? null}
          displayName={displayName}
          createdAt={user?.createdAt ?? null}
          credits={credits}
          plan={plan}
          totalCredits={total}
        />

        <div className="mt-12 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <h2 className="font-serif text-xl text-ink">Gefahrenbereich</h2>
        </div>
        <DangerZone />
      </main>
      <Footer />
    </div>
  );
}
