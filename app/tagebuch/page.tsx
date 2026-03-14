import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TagebuchClient } from "@/components/tagebuch/tagebuch-client";

export const dynamic = "force-dynamic";

export default async function TagebuchPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = createSupabaseAdmin();

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("ea_food_log")
    .select("*")
    .eq("user_id", userId)
    .eq("datum", today)
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Ernährungstagebuch
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Halte fest, was du isst – für einen besseren Überblick.
        </p>
        <TagebuchClient initialEntries={data || []} today={today} />
      </main>
      <Footer />
    </div>
  );
}
