import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  Clock3,
  Cpu,
  Euro,
  Users,
} from "lucide-react";

import { UsageCostChart } from "@/components/admin/usage-cost-chart";
import { createSupabaseAdmin } from "@/lib/supabase/server";

type SearchParams = {
  range?: string;
  sort?: string;
  user?: string;
};

type UsageRow = {
  user_id: string | null;
  plan: string | null;
  endpoint: string | null;
  action: string | null;
  model: string | null;
  input_tokens: number | string | null;
  output_tokens: number | string | null;
  cost_usd: number | string | null;
  cost_eur: number | string | null;
  credits_charged: number | null;
  credits_refunded: boolean | null;
  request_id: string | null;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
};

type UserRow = {
  clerk_id: string;
  email: string | null;
  subscription_plan: string | null;
};

const RANGE_OPTIONS = [7, 30, 90];

export default async function AdminUsagePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const rangeDays = parseRange(searchParams?.range);
  const sort = searchParams?.sort === "calls" ? "calls" : "cost";
  const selectedUserId = searchParams?.user || null;

  const supabase = createSupabaseAdmin();
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const lastMonthStart = addMonths(currentMonthStart, -1);
  const rangeStart = addDays(now, -rangeDays);
  const trendStart = addDays(startOfDay(now), -29);
  const alertStart = addDays(now, -7);

  const [currentMonth, lastMonth, rangeRows, trendRows, alertRows] = await Promise.all([
    fetchUsageRows(supabase, currentMonthStart),
    fetchUsageRows(supabase, lastMonthStart, currentMonthStart),
    fetchUsageRows(supabase, rangeStart),
    fetchUsageRows(supabase, trendStart),
    fetchUsageRows(supabase, alertStart),
  ]);

  const allUserIds = Array.from(
    new Set(
      [...rangeRows, ...alertRows]
        .map((row) => row.user_id)
        .filter((id): id is string => !!id)
    )
  );
  const usersById = await fetchUsersById(supabase, allUserIds);

  const currentStats = summarizeRows(currentMonth);
  const lastStats = summarizeRows(lastMonth);
  const trendDelta = currentStats.eur - lastStats.eur;
  const trendPct = lastStats.eur > 0 ? (trendDelta / lastStats.eur) * 100 : currentStats.eur > 0 ? 100 : 0;
  const trendUp = trendDelta >= 0;
  const todayIso = isoDate(startOfDay(now));
  const todayCalls = trendRows.filter((row) => isoDate(new Date(row.created_at)) === todayIso).length;
  const weekCalls = alertRows.length;

  const topUsers = buildTopUsers(rangeRows, usersById, sort).slice(0, 10);
  const planRows = buildPlanRows(rangeRows);
  const actionRows = buildActionRows(rangeRows).slice(0, 12);
  const chartData = buildTrendData(trendRows, trendStart, now);
  const costAlerts = buildCostAlerts(alertRows, usersById);
  const hourlyAlerts = buildHourlyAlerts(alertRows, usersById);
  const selectedUserRows = selectedUserId
    ? rangeRows.filter((row) => row.user_id === selectedUserId).slice(0, 50)
    : [];
  const selectedUser = selectedUserId ? usersById.get(selectedUserId) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">AI Usage</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink">
            API-Kosten & Token-Verbrauch
          </h1>
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          {RANGE_OPTIONS.map((days) => (
            <Link
              key={days}
              href={`/admin/usage?range=${days}&sort=${sort}`}
              className={`px-3 py-1.5 text-sm rounded-md ${
                rangeDays === days
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-primary-bg"
              }`}
            >
              {days} Tage
            </Link>
          ))}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Euro}
          label="Kosten aktueller Monat"
          value={formatEur(currentStats.eur)}
          sub={`${formatUsd(currentStats.usd)} · ${currentStats.calls} Calls`}
        />
        <MetricCard
          icon={trendUp ? ArrowUpRight : ArrowDownRight}
          label="Vergleich letzter Monat"
          value={`${trendUp ? "+" : ""}${trendPct.toFixed(1)}%`}
          sub={`${formatEur(lastStats.eur)} im letzten Monat`}
          tone={trendUp ? "warn" : "good"}
        />
        <MetricCard
          icon={Activity}
          label="API-Calls"
          value={`${todayCalls} heute`}
          sub={`${weekCalls} letzte 7 Tage · ${currentStats.calls} diesen Monat`}
        />
        <MetricCard
          icon={Clock3}
          label="Ø Dauer"
          value={`${Math.round(currentStats.avgDurationMs)} ms`}
          sub="Anthropic/OpenAI Calls im Monat"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Trend letzte 30 Tage</h2>
              <p className="text-sm text-gray-500">Tägliche API-Kosten in EUR</p>
            </div>
          </div>
          <UsageCostChart data={chartData} />
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-ink">Alerts</h2>
          </div>
          <div className="space-y-4">
            <AlertList
              title=">5 EUR Kosten in 7 Tagen"
              rows={costAlerts.map((alert) => ({
                label: alert.email,
                value: formatEur(alert.cost),
                href: `/admin/usage?range=7&sort=cost&user=${encodeURIComponent(alert.userId)}`,
              }))}
            />
            <AlertList
              title=">50 Calls pro Stunde"
              rows={hourlyAlerts.map((alert) => ({
                label: `${alert.email} · ${alert.hour}`,
                value: `${alert.calls} Calls`,
                href: `/admin/usage?range=7&sort=calls&user=${encodeURIComponent(alert.userId)}`,
              }))}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Top 10 Power-User</h2>
              <p className="text-sm text-gray-500">Zeitraum: letzte {rangeDays} Tage</p>
            </div>
            <div className="flex rounded-lg border border-gray-200 p-1 text-sm">
              <Link
                href={`/admin/usage?range=${rangeDays}&sort=cost`}
                className={`rounded-md px-3 py-1.5 ${sort === "cost" ? "bg-primary text-white" : "text-gray-600"}`}
              >
                Kosten
              </Link>
              <Link
                href={`/admin/usage?range=${rangeDays}&sort=calls`}
                className={`rounded-md px-3 py-1.5 ${sort === "calls" ? "bg-primary text-white" : "text-gray-600"}`}
              >
                Calls
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4 font-semibold">User</th>
                  <th className="py-2 pr-4 font-semibold">Plan</th>
                  <th className="py-2 pr-4 text-right font-semibold">Calls</th>
                  <th className="py-2 pr-4 text-right font-semibold">Kosten</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((user) => (
                  <tr key={user.userId} className="border-b border-gray-50">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/usage?range=${rangeDays}&sort=${sort}&user=${encodeURIComponent(user.userId)}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {user.email}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{user.plan}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{user.calls}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{formatEur(user.cost)}</td>
                  </tr>
                ))}
                {topUsers.length === 0 && (
                  <tr>
                    <td className="py-8 text-center text-gray-500" colSpan={4}>
                      Noch keine Usage-Daten im gewählten Zeitraum.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-ink">Kosten pro Plan</h2>
          </div>
          <div className="space-y-3">
            {planRows.map((row) => (
              <div key={row.plan} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-ink">{row.plan}</span>
                  <span className="text-sm font-semibold text-ink">{formatEur(row.cost)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {row.users} User · {row.calls} Calls · Ø {formatEur(row.avgPerUser)} pro User
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-ink">Kosten pro Action-Type</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4 font-semibold">Action</th>
                <th className="py-2 pr-4 font-semibold">Endpoint</th>
                <th className="py-2 pr-4 text-right font-semibold">Calls</th>
                <th className="py-2 pr-4 text-right font-semibold">Kosten</th>
                <th className="py-2 pr-4 text-right font-semibold">Ø Kosten</th>
              </tr>
            </thead>
            <tbody>
              {actionRows.map((row) => (
                <tr key={`${row.endpoint}:${row.action}`} className="border-b border-gray-50">
                  <td className="py-3 pr-4 font-medium text-ink">{row.action}</td>
                  <td className="py-3 pr-4 text-gray-600">{row.endpoint}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{row.calls}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{formatEur(row.cost)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{formatEur(row.avgCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedUserId && (
        <section className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                User-Detail: {selectedUser?.email || selectedUserId}
              </h2>
              <p className="text-sm text-gray-500">Letzte {rangeDays} Tage, maximal 50 Einträge</p>
            </div>
            <Link href={`/admin/usage?range=${rangeDays}&sort=${sort}`} className="text-sm text-primary hover:underline">
              Auswahl zurücksetzen
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4 font-semibold">Zeit</th>
                  <th className="py-2 pr-4 font-semibold">Action</th>
                  <th className="py-2 pr-4 font-semibold">Model</th>
                  <th className="py-2 pr-4 text-right font-semibold">Tokens</th>
                  <th className="py-2 pr-4 text-right font-semibold">Credits</th>
                  <th className="py-2 pr-4 text-right font-semibold">Kosten</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedUserRows.map((row) => (
                  <tr key={`${row.request_id}:${row.created_at}:${row.action}`} className="border-b border-gray-50">
                    <td className="py-3 pr-4 whitespace-nowrap text-gray-600">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="py-3 pr-4 font-medium text-ink">{row.action || "-"}</td>
                    <td className="py-3 pr-4 text-gray-600">{row.model || "-"}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {toNumber(row.input_tokens) + toNumber(row.output_tokens)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {row.credits_charged ?? 0}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{formatEur(toNumber(row.cost_eur))}</td>
                    <td className="py-3 pr-4">
                      {row.error ? (
                        <span className="text-red-600">Fehler</span>
                      ) : row.credits_refunded ? (
                        <span className="text-amber-600">Refund</span>
                      ) : (
                        <span className="text-emerald-700">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

async function fetchUsageRows(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  from: Date,
  to?: Date
): Promise<UsageRow[]> {
  let query = supabase
    .from("ea_ai_usage")
    .select(
      "user_id, plan, endpoint, action, model, input_tokens, output_tokens, cost_usd, cost_eur, credits_charged, credits_refunded, request_id, error, duration_ms, created_at"
    )
    .gte("created_at", from.toISOString())
    .order("created_at", { ascending: false })
    .limit(10000);

  if (to) {
    query = query.lt("created_at", to.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/usage] usage query failed", error);
    return [];
  }

  return (data ?? []) as UsageRow[];
}

async function fetchUsersById(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  userIds: string[]
): Promise<Map<string, UserRow>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("ea_users")
    .select("clerk_id, email, subscription_plan")
    .in("clerk_id", userIds);

  if (error) {
    console.error("[admin/usage] user query failed", error);
    return new Map();
  }

  return new Map(((data ?? []) as UserRow[]).map((user) => [user.clerk_id, user]));
}

function summarizeRows(rows: UsageRow[]) {
  const durationRows = rows.filter((row) => typeof row.duration_ms === "number" && row.duration_ms > 0);
  const durationSum = durationRows.reduce((sum, row) => sum + (row.duration_ms ?? 0), 0);

  return {
    calls: rows.length,
    eur: rows.reduce((sum, row) => sum + toNumber(row.cost_eur), 0),
    usd: rows.reduce((sum, row) => sum + toNumber(row.cost_usd), 0),
    avgDurationMs: durationRows.length ? durationSum / durationRows.length : 0,
  };
}

function buildTopUsers(rows: UsageRow[], usersById: Map<string, UserRow>, sort: "cost" | "calls") {
  const grouped = new Map<string, { userId: string; calls: number; cost: number; plan: string }>();

  for (const row of rows) {
    if (!row.user_id) continue;
    const current = grouped.get(row.user_id) ?? {
      userId: row.user_id,
      calls: 0,
      cost: 0,
      plan: row.plan || usersById.get(row.user_id)?.subscription_plan || "unknown",
    };
    current.calls += 1;
    current.cost += toNumber(row.cost_eur);
    current.plan = row.plan || current.plan;
    grouped.set(row.user_id, current);
  }

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      email: usersById.get(row.userId)?.email || row.userId,
    }))
    .sort((a, b) => (sort === "calls" ? b.calls - a.calls : b.cost - a.cost));
}

function buildPlanRows(rows: UsageRow[]) {
  const grouped = new Map<string, { plan: string; calls: number; cost: number; users: Set<string> }>();

  for (const row of rows) {
    const plan = row.plan || "unknown";
    const current = grouped.get(plan) ?? { plan, calls: 0, cost: 0, users: new Set<string>() };
    current.calls += 1;
    current.cost += toNumber(row.cost_eur);
    if (row.user_id) current.users.add(row.user_id);
    grouped.set(plan, current);
  }

  return Array.from(grouped.values())
    .map((row) => ({
      plan: row.plan,
      calls: row.calls,
      cost: row.cost,
      users: row.users.size,
      avgPerUser: row.users.size ? row.cost / row.users.size : 0,
    }))
    .sort((a, b) => b.cost - a.cost);
}

function buildActionRows(rows: UsageRow[]) {
  const grouped = new Map<string, { endpoint: string; action: string; calls: number; cost: number }>();

  for (const row of rows) {
    const endpoint = row.endpoint || "unknown";
    const action = row.action || "unknown";
    const key = `${endpoint}:${action}`;
    const current = grouped.get(key) ?? { endpoint, action, calls: 0, cost: 0 };
    current.calls += 1;
    current.cost += toNumber(row.cost_eur);
    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .map((row) => ({ ...row, avgCost: row.calls ? row.cost / row.calls : 0 }))
    .sort((a, b) => b.cost - a.cost);
}

function buildTrendData(rows: UsageRow[], start: Date, end: Date) {
  const byDate = new Map<string, { eur: number; calls: number }>();
  for (const row of rows) {
    const key = isoDate(new Date(row.created_at));
    const current = byDate.get(key) ?? { eur: 0, calls: 0 };
    current.eur += toNumber(row.cost_eur);
    current.calls += 1;
    byDate.set(key, current);
  }

  const days = [];
  let cursor = startOfDay(start);
  const endDay = startOfDay(end);
  while (cursor <= endDay) {
    const key = isoDate(cursor);
    const current = byDate.get(key) ?? { eur: 0, calls: 0 };
    days.push({
      date: cursor.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
      eur: Number(current.eur.toFixed(6)),
      calls: current.calls,
    });
    cursor = addDays(cursor, 1);
  }
  return days;
}

function buildCostAlerts(rows: UsageRow[], usersById: Map<string, UserRow>) {
  const grouped = new Map<string, number>();
  for (const row of rows) {
    if (!row.user_id) continue;
    grouped.set(row.user_id, (grouped.get(row.user_id) ?? 0) + toNumber(row.cost_eur));
  }

  return Array.from(grouped.entries())
    .filter(([, cost]) => cost > 5)
    .map(([userId, cost]) => ({
      userId,
      cost,
      email: usersById.get(userId)?.email || userId,
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);
}

function buildHourlyAlerts(rows: UsageRow[], usersById: Map<string, UserRow>) {
  const grouped = new Map<string, { userId: string; hour: string; calls: number }>();
  for (const row of rows) {
    if (!row.user_id) continue;
    const hour = new Date(row.created_at).toISOString().slice(0, 13) + ":00";
    const key = `${row.user_id}:${hour}`;
    const current = grouped.get(key) ?? { userId: row.user_id, hour, calls: 0 };
    current.calls += 1;
    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .filter((row) => row.calls > 50)
    .map((row) => ({
      ...row,
      email: usersById.get(row.userId)?.email || row.userId,
    }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 5);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon: typeof Euro;
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700"
      : "bg-primary-bg text-primary";

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{sub}</p>
    </div>
  );
}

function AlertList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string; href: string }>;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{title}</p>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <Link
              key={`${row.label}:${row.value}`}
              href={row.href}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm hover:bg-primary-bg"
            >
              <span className="truncate text-gray-700">{row.label}</span>
              <span className="shrink-0 font-medium text-ink">{row.value}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-500">
          Keine Treffer.
        </p>
      )}
    </div>
  );
}

function parseRange(value: string | undefined): number {
  const parsed = Number(value);
  return RANGE_OPTIONS.includes(parsed) ? parsed : 30;
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
