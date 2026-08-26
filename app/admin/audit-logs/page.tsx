import { getAuditLogs } from "@/lib/services/admin-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  await requireRole("ADMIN");
  const logs = await getAuditLogs();

  return (
    <div>
      <PageHeader title="Audit Logs" description="Every important administrative action, recorded." />

      {logs.length === 0 ? (
        <EmptyState icon="🧾" title="No audit records yet" />
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap text-slate-500">{formatDateTime(l.createdAt)}</td>
                  <td>
                    {l.user ? (
                      <>
                        <p className="font-semibold">{l.user.fullName}</p>
                        <p className="text-xs text-slate-500">{l.user.role}</p>
                      </>
                    ) : (
                      <span className="text-slate-400">System</span>
                    )}
                  </td>
                  <td>
                    <span className="badge bg-slate-100 text-slate-700">{l.action}</span>
                  </td>
                  <td className="text-slate-600">
                    {l.entity}
                    {l.entityId && <p className="font-mono text-[11px] text-slate-400">{l.entityId}</p>}
                  </td>
                  <td className="max-w-[240px]">
                    {l.metadata ? (
                      <pre className="whitespace-pre-wrap text-[11px] text-slate-500">
                        {JSON.stringify(l.metadata, null, 1)}
                      </pre>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
