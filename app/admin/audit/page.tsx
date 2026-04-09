import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  target_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function shortId(id: string | null): string {
  if (!id) return "–";
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export default async function AuditLogPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = createSupabaseAdmin();

  const { data: roleData } = await supabase
    .from("ea_user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);

  if (roleData?.[0]?.role !== "admin") redirect("/chat");

  const { data: rows } = await supabase
    .from("ea_admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const entries: AuditRow[] = rows || [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Audit-Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Die letzten 100 Admin-Aktionen. Read- und Write-Zugriffe auf
          Nutzerdaten werden hier protokolliert (DSGVO-Nachweisbarkeit).
        </p>
      </header>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Zeitpunkt</th>
                <th className="px-4 py-3 text-left font-semibold">Admin</th>
                <th className="px-4 py-3 text-left font-semibold">Aktion</th>
                <th className="px-4 py-3 text-left font-semibold">Resource</th>
                <th className="px-4 py-3 text-left font-semibold">Resource-ID</th>
                <th className="px-4 py-3 text-left font-semibold">Ziel-User</th>
                <th className="px-4 py-3 text-left font-semibold">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-gray-400 text-sm"
                  >
                    Noch keine Einträge.
                  </td>
                </tr>
              ) : (
                entries.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap font-mono">
                      {formatDate(row.created_at)}
                    </td>
                    <td
                      className="px-4 py-2.5 text-gray-700 font-mono"
                      title={row.admin_id}
                    >
                      {shortId(row.admin_id)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-bg text-primary font-medium">
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {row.resource_type}
                    </td>
                    <td
                      className="px-4 py-2.5 text-gray-500 font-mono"
                      title={row.resource_id ?? ""}
                    >
                      {shortId(row.resource_id)}
                    </td>
                    <td
                      className="px-4 py-2.5 text-gray-500 font-mono"
                      title={row.target_user_id ?? ""}
                    >
                      {shortId(row.target_user_id)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 font-mono max-w-xs truncate">
                      {row.metadata && Object.keys(row.metadata).length > 0
                        ? JSON.stringify(row.metadata)
                        : "–"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
