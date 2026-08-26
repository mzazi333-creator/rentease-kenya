import Link from "next/link";
import { listTenantsAdmin } from "@/lib/services/admin-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminTenantListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const q = sp.q ?? "";
  const tenants = await listTenantsAdmin({ q: q || undefined });

  return (
    <div>
      <PageHeader
        title="Tenant Management"
        description="All tenant accounts and their current houses."
        actions={
          <Link href="/admin/tenants" className="btn-secondary">
            Pending applications
          </Link>
        }
      />

      <form className="mb-5 flex gap-2" action="/admin/tenants/list" method="GET">
        <input name="q" defaultValue={q} placeholder="Search tenants…" className="input max-w-md" aria-label="Search tenants" />
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {tenants.length === 0 ? (
        <EmptyState icon="👥" title="No tenants found" />
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Current House</th>
                <th>Registered</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const active = t.tenancies[0];
                return (
                  <tr key={t.id}>
                    <td>
                      <p className="font-semibold">{t.fullName}</p>
                      <p className="text-xs text-slate-500">{t.phone} · {t.email}</p>
                    </td>
                    <td>
                      {active ? (
                        <>
                          <p className="font-semibold">{active.building.name}</p>
                          <p className="text-xs text-slate-500">House {active.unit.unitNumber}</p>
                        </>
                      ) : (
                        <span className="text-slate-400">No house</span>
                      )}
                    </td>
                    <td className="text-slate-500">{formatDate(t.createdAt)}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      <Link href={`/admin/tenants/${t.id}`} className="btn-secondary !px-3 !py-1.5 !text-xs">
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
