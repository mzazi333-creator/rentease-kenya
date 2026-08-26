import Link from "next/link";
import { listMyApplications } from "@/lib/services/application-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import ActionButton from "@/components/ui/ActionButton";
import { cancelApplicationAction } from "@/app/actions/applications";
import { formatKSh, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TenantApplicationsPage() {
  const user = await requireRole("TENANT");
  const applications = await listMyApplications({ id: user.id, role: user.role });

  return (
    <div>
      <PageHeader
        title="My Applications"
        description="Track your house applications."
        actions={
          <Link href="/rentals" className="btn-primary">
            Search More Rentals
          </Link>
        }
      />

      {applications.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No applications yet"
          description="Browse available rentals and apply for a house you like."
          action={<Link href="/rentals" className="btn-primary">Browse rentals</Link>}
        />
      ) : (
        <div className="space-y-3">
          {applications.map((a) => (
            <div key={a.id} className="card card-pad flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-slate-900">
                  {a.building.name} — House {a.unit.unitNumber}
                </p>
                <p className="text-sm text-slate-500">
                  {a.floor.name} · {formatKSh(a.unit.monthlyRent)}/mo · Applied {formatDate(a.createdAt)}
                </p>
                {a.note && <p className="mt-1 text-xs text-slate-500">Note: {a.note}</p>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.status} />
                {a.status === "PENDING_APPROVAL" && (
                  <ActionButton
                    label="Cancel"
                    action={() => cancelApplicationAction(a.id)}
                    confirm="Cancel this application?"
                    confirmLabel="Cancel application"
                    danger
                    className="btn-ghost !px-2.5 !py-1 !text-xs text-red-600"
                  >
                    Cancel
                  </ActionButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
