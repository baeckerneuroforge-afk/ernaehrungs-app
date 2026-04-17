import { NextResponse } from "next/server";
import { previousMonth, runMonthlyReportsForAllPremium } from "@/lib/monthly-report";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — LLM calls can be slow

/**
 * Monthly report cron. Triggered by Vercel Cron on the 1st of each month
 * at 06:00 UTC. Generates the previous month's report for all premium users.
 *
 * Security: Vercel adds the header `Authorization: Bearer <CRON_SECRET>` when
 * CRON_SECRET is set in the project. We reject requests without it.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = previousMonth();
  const result = await runMonthlyReportsForAllPremium(month);

  return NextResponse.json({
    ok: true,
    month,
    ...result,
  });
}
