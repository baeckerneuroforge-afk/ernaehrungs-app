import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WochencheckClient } from "@/components/tracker/wochencheck-client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WochencheckPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full pb-bottom-nav">
        <Link
          href="/tracker"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Tracker
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
          <WochencheckClient />
        </div>
      </main>
      <Footer />
    </div>
  );
}
