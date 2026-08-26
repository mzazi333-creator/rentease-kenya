import Link from "next/link";
import { listLandlordBuildings } from "@/lib/services/building-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatKSh, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LandlordBuildingsPage() {
  const user = await requireRole("LANDLORD");
  const buildings = await listLandlordBuildings({ id: user.id, role: user.role });

  return (
    <div>
      <PageHeader
        title="My Buildings"
        description="Manage your properties and their structure."
        actions={
          <Link href="/register/building" className="btn-primary">
            + Register Building
          </Link>
        }
      />

      {buildings.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="No buildings yet"
          description="Register your first building to start managing it on RentEase."
          action={
            <Link href="/register/building" className="btn-primary">
              Register Your Building
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buildings.map((b) => (
            <Link key={b.id} href={`/dashboard/landlord/buildings/${b.id}`} className="card card-pad transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900">{b.name}</h3>
                <StatusBadge status={b.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {b.town}, {b.county} · {b.propertyType}
              </p>
              {b.status === "REJECTED" && b.approvalNote && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {b.approvalNote}
                </p>
              )}
              {b.status === "PENDING_APPROVAL" && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Awaiting admin review — not yet public.
                </p>
              )}
              <div className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-center">
                <div><p className="text-sm font-bold text-slate-900">{b.floorsCount}</p><p className="text-[11px] text-slate-400">Floors</p></div>
                <div><p className="text-sm font-bold text-slate-900">{b.unitsCount}</p><p className="text-[11px] text-slate-400">Units</p></div>
                <div><p className="text-sm font-bold text-green-700">{b.vacantCount}</p><p className="text-[11px] text-slate-400">Vacant</p></div>
                <div><p className="text-sm font-bold text-blue-700">{b.occupiedCount}</p><p className="text-[11px] text-slate-400">Occupied</p></div>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Expected rent: <span className="font-semibold text-slate-600">{formatKSh(b.expectedMonthlyRent)}/mo</span> · Listed {formatDate(b.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
