import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProfilForm } from "@/components/profil/profil-form";
import { DangerZone } from "@/components/profil/danger-zone";
import { AlertTriangle } from "lucide-react";

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

  const displayName =
    (profile?.[0]?.name as string) ||
    user?.firstName ||
    user?.username ||
    "Willkommen";

  // Mock credits for now – replace with real source when available
  const credits = { used: 2, total: 15 };

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-ink">Dein Profil</h1>
          <p className="text-ink-muted mt-1 text-sm">
            Diese Informationen helfen uns, dir bessere und persönlichere
            Empfehlungen zu geben.
          </p>
        </div>

        <ProfilForm
          userId={userId}
          existingProfile={profile?.[0] || null}
          imageUrl={user?.imageUrl ?? null}
          displayName={displayName}
          createdAt={user?.createdAt ?? null}
          credits={credits}
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
