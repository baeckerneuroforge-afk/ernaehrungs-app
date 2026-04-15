import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TagebuchClient } from "@/components/tagebuch/tagebuch-client";
import { getUserPlan } from "@/lib/feature-gates-server";
import { hasFeatureAccess } from "@/lib/feature-gates";
import { Upload } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TagebuchPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = createSupabaseAdmin();

  const today = new Date().toISOString().split("T")[0];

  const [{ data }, plan] = await Promise.all([
    supabase
      .from("ea_food_log")
      .select("*")
      .eq("user_id", userId)
      .eq("datum", today)
      .order("created_at", { ascending: true }),
    getUserPlan(userId),
  ]);

  const canUsePhoto = hasFeatureAccess(plan, "foto_tracking");
  const canImport = hasFeatureAccess(plan, "csv_import");

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-800">
            Ernährungstagebuch
          </h1>
          {canImport && (
            <Link
              href="/einstellungen/import"
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover transition flex-shrink-0 mt-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              CSV Import
            </Link>
          )}
        </div>
        <p className="text-gray-500 text-sm mb-8">
          Halte fest, was du isst – für einen besseren Überblick.
        </p>
        <TagebuchClient
          initialEntries={data || []}
          today={today}
          canUsePhoto={canUsePhoto}
        />
      </main>
      <Footer />
    </div>
  );
}
