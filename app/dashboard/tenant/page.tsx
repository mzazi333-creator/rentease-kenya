import Link from "next/link";
import { getTenantDashboard } from "@/lib/services/dashboard-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatKSh, formatDate, monthName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TenantDashboardPage() {
  const user = await requireRole("TENANT");
  const data = await getTenantDashboard({ id: user.id, role: user.role });

  return (
    <div>
      <PageHeader
        title={`Karibu, ${user.fullName.split(" ")[0]}! 👋`}
        description="Your rental overview."
        actions={
          !data.tenancy ? (
            <Link href="/rentals" className="btn-primary">
              Search Rentals
            </Link>
          ) : undefined
        }
      />

      {!data.tenancy ? (
        <div className="space-y-6">
          <EmptyState
            icon="🏠"
            title="You don't have a house yet"
            description="Search approved buildings, apply for a vacant house, and once your application is approved you'll be assigned a home."
            action={
              <Link href="/rentals" className="btn-primary">
                Find Your Next Home
              </Link>
            }
          />
          {data.applications.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-slate-900">My Applications</h2>
              <div className="space-y-2">
                {data.applications.map((a) => (
                  <div key={a.id} className="card card-pad flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {a.buildingName} — House {a.unitNumber}
                      </p>
                      <p className="text-xs text-slate-500">Applied {formatDate(a.createdAt)}</p>
                      {a.note && <p className="mt-1 text-xs text-slate-500">{a.note}</p>}
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="House" value={`${data.tenancy.unitNumber}`} sub={data.tenancy.building.name} accent="green" />
            <StatCard label="Monthly Rent" value={formatKSh(data.tenancy.monthlyRent)} sub={`Due ${data.tenancy.building.defaultDueDay}th of every month`} accent="blue" />
            <StatCard
              label="Rent Status"
              value={data.rent?.status ?? "—"}
              accent={data.rent?.status === "PAID" ? "green" : data.rent?.status === "OVERDUE" ? "red" : "amber"}
            />
            <StatCard label="Location" value={data.tenancy.building.location} sub={`${data.tenancy.floorName}`} accent="slate" />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="card card-pad">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">My House</h2>
                <Link href="/dashboard/tenant/my-house" className="text-sm font-semibold text-brand-600 hover:underline">
                  Details →
                </Link>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Building</dt><dd className="font-semibold">{data.tenancy.building.name}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Floor</dt><dd className="font-semibold">{data.tenancy.floorName}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">House</dt><dd className="font-semibold">{data.tenancy.unitNumber}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Moved in</dt><dd className="font-semibold">{formatDate(data.tenancy.startedAt)}</dd></div>
              </dl>
            </section>

            <section className="card card-pad">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Rent — {monthName(data.rent?.month ?? new Date().getMonth() + 1)} {data.rent?.year ?? new Date().getFullYear()}</h2>
                <StatusBadge status={data.rent?.status ?? "PENDING"} />
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Amount due</dt><dd className="font-bold text-brand-700">{formatKSh(data.tenancy.monthlyRent)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Due date</dt><dd className="font-semibold">{data.rent ? formatDate(data.rent.dueDate) : "—"}</dd></div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Link href="/dashboard/tenant/payments" className="btn-primary flex-1">
                  Pay Rent (M-Pesa)
                </Link>
                <Link href="/dashboard/tenant/rent" className="btn-secondary flex-1">
                  View Details
                </Link>
              </div>
            </section>
          </div>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recent Payments</h2>
              <Link href="/dashboard/tenant/payments" className="text-sm font-semibold text-brand-600 hover:underline">
                All payments →
              </Link>
            </div>
            {data.recentPayments.length === 0 ? (
              <EmptyState icon="💰" title="No payments yet" description="Once you submit an M-Pesa payment, it will appear here." />
            ) : (
              <div className="table-wrap">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Amount</th>
                      <th>M-Pesa Code</th>
                      <th>Status</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="font-semibold">{monthName(p.month)} {p.year}</td>
                        <td>{formatKSh(p.amount)}</td>
                        <td className="font-mono text-xs">{p.transactionCode}</td>
                        <td>
                          <StatusBadge status={p.status} />
                          {p.rejectionReason && (
                            <p className="mt-1 max-w-[200px] text-[11px] text-red-600">{p.rejectionReason}</p>
                          )}
                        </td>
                        <td className="text-slate-500">{formatDate(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
