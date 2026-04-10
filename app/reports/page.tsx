import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/feature-gates-server";
import { hasFeatureAccess } from "@/lib/feature-gates";
import { ReportsClient } from "@/components/reports/reports-client";
import { UpgradePrompt } from "@/components/reports/upgrade-prompt";
import type { MonthlyReportData } from "@/lib/monthly-report";

export const dynamic = "force-dynamic";

type ReportRow = {
  id: string;
  month: string;
  report_data: MonthlyReportData;
  created_at: string;
};

export default async function ReportsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const plan = await getUserPlan(userId);

  if (!hasFeatureAccess(plan, "monthly_report")) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-bg">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full pb-bottom-nav">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Monatsreport
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Dein persönlicher KI-Fortschrittsreport — jeden Monat automatisch.
          </p>
          <UpgradePrompt />
        </main>
        <Footer />
      </div>
    );
  }

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ea_monthly_reports")
    .select("id, month, report_data, created_at")
    .eq("user_id", userId)
    .order("month", { ascending: false });

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full pb-bottom-nav">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Monatsreport
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Dein persönlicher KI-Fortschrittsreport — jeden Monat automatisch.
        </p>
        <ReportsClient reports={(data as ReportRow[]) || []} />
      </main>
      <Footer />
    </div>
  );
}
