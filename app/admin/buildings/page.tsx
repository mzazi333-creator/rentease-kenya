import Link from "next/link";
import { listBuildingsAdmin } from "@/lib/services/admin-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import AdminBuildingActions from "@/components/admin/AdminBuildingActions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusTabs = [
  { value: "", label: "All" },
  { value: "PENDING_APPROVAL", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUSPENDED", label: "Suspended" },
];

export default async function AdminBuildingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const status = sp.status ?? "";
  const q = sp.q ?? "";

  const buildings = await listBuildingsAdmin({
    status: status ? (status as never) : undefined,
    q: q || undefined,
  });

  return (
    <div>
      <PageHeader title="Buildings" description="Review, approve and manage all properties." />

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {statusTabs.map((t) => (
          <Link
            key={t.value}
            href={t.value ? `/admin/buildings?status=${t.value}` : "/admin/buildings"}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              status === t.value ? "bg-brand-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form className="mb-5 flex gap-2" action="/admin/buildings" method="GET">
        <input name="status" type="hidden" value={status} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, town, county…"
          className="input max-w-md"
          aria-label="Search buildings"
        />
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {buildings.length === 0 ? (
        <EmptyState icon="🏢" title="No buildings found" description="Buildings registered by landlords will appear here." />
      ) : (
        <div className="space-y-4">
          {buildings.map((b) => (
            <div key={b.id} className="card card-pad">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900">{b.name}</h3>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {b.town}, {b.county} · {b.propertyType} · {b.location}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Landlord: <span className="font-semibold">{b.landlord.user.fullName}</span> ·{" "}
                    {b.landlord.user.phone}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {b._count.floors} floors · {b._count.units} units · Submitted {formatDate(b.createdAt)}
                  </p>
                  {b.approvalNote && (
                    <p className="mt-2 max-w-xl rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                      {b.approvalNote}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link href={`/admin/buildings/${b.id}`} className="btn-secondary !px-3 !py-1.5 !text-xs">
                    View details
                  </Link>
                  <AdminBuildingActions buildingId={b.id} status={b.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
