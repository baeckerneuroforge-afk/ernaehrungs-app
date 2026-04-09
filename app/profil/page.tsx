import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProfilForm } from "@/components/profil/profil-form";
import { DangerZone } from "@/components/profil/danger-zone";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from("ea_profiles")
    .select("*")
    .eq("user_id", userId)
    .limit(1);

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Dein Profil</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Diese Informationen helfen uns, dir bessere und persönlichere
            Empfehlungen zu geben.
          </p>
        </div>
        <ProfilForm
          userId={userId}
          existingProfile={profile?.[0] || null}
        />
        <DangerZone />
      </main>
      <Footer />
    </div>
  );
}
