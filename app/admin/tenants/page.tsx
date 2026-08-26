import Link from "next/link";
import { listPendingApplications, listAllApplications } from "@/lib/services/application-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import AdminApplicationActions from "@/components/admin/AdminApplicationActions";
import { formatKSh, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminTenantsPage() {
  await requireRole("ADMIN");
  const [pending, all] = await Promise.all([listPendingApplications(), listAllApplications()]);

  return (
    <div>
      <PageHeader
        title="Tenant Applications"
        description="Review applications and manage tenants."
        actions={
          <Link href="/admin/users?role=TENANT" className="btn-secondary">
            All tenants
          </Link>
        }
      />

      <h2 className="mb-3 text-lg font-bold text-slate-900">
        Pending Approvals ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <EmptyState icon="✅" title="No pending applications" description="New tenant applications will appear here." />
      ) : (
        <div className="space-y-3">
          {pending.map((a) => (
            <div key={a.id} className="card card-pad">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">
                    {a.tenant.fullName}{" "}
                    <span className="text-xs font-medium text-slate-400">({a.tenant.phone})</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {a.tenant.email} {a.tenant.nationalId ? `· ID ${a.tenant.nationalId}` : ""}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">{a.building.name}</span> — {a.floor.name} · House{" "}
                    {a.unit.unitNumber} · <span className="font-semibold">{formatKSh(a.unit.monthlyRent)}/mo</span>
                  </p>
                  <p className="text-xs text-slate-400">Applied {formatDate(a.createdAt)}</p>
                  {a.note && <p className="mt-1 text-xs text-slate-500">Note: {a.note}</p>}
                </div>
                <AdminApplicationActions applicationId={a.id} status={a.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-lg font-bold text-slate-900">All Applications</h2>
      {all.length === 0 ? (
        <EmptyState icon="📋" title="No applications yet" />
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>House</th>
                <th>Rent</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {all.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold">{a.tenant.fullName}</td>
                  <td>
                    {a.building.name} · {a.floor.name} · {a.unit.unitNumber}
                  </td>
                  <td>{formatKSh(a.unit.monthlyRent)}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td className="text-slate-500">{formatDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
