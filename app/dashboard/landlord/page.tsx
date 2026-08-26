import Link from "next/link";
import { getLandlordDashboard } from "@/lib/services/dashboard-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatKSh, formatDateTime, monthName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LandlordDashboardPage() {
  const user = await requireRole("LANDLORD");
  const data = await getLandlordDashboard({ id: user.id, role: user.role });

  return (
    <div>
      <PageHeader
        title={`Karibu, ${user.fullName.split(" ")[0]}! 👋`}
        description="Manage your buildings, tenants and rent payments."
        actions={
          <Link href="/register/building" className="btn-primary">
            + Register Building
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Buildings" value={data.stats.totalBuildings} sub={`${data.stats.pendingBuildings} awaiting approval`} accent="green" />
        <StatCard label="Total Units" value={data.stats.totalUnits} sub={`${data.stats.totalFloors} floors`} accent="blue" />
        <StatCard label="Occupied" value={data.stats.occupiedUnits} sub={`${data.stats.vacantUnits} vacant`} accent="slate" />
        <StatCard label="Monthly Expected" value={formatKSh(data.stats.monthlyExpectedRent)} accent="green" />
        <StatCard label="Confirmed Payments" value={data.stats.confirmedPayments} accent="green" />
        <StatCard label="Pending Confirmations" value={data.stats.pendingPayments} accent="amber" />
        <StatCard label="Overdue Tenants" value={data.stats.overdueRent} accent={data.stats.overdueRent > 0 ? "red" : "slate"} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Overdue */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Overdue Rent</h2>
          {data.overdueTenancies.length === 0 ? (
            <EmptyState icon="✅" title="No overdue payments" description="All your tenants are up to date." />
          ) : (
            <div className="table-wrap">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>House</th>
                    <th>Rent</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdueTenancies.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <p className="font-semibold">{t.tenantName}</p>
                        <p className="text-xs text-slate-500">{t.phone}</p>
                      </td>
                      <td>{t.buildingName} · {t.unitNumber}</td>
                      <td className="font-semibold text-red-600">{formatKSh(t.monthlyRent)}</td>
                      <td>Day {t.dueDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent payments */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Recent Payments</h2>
          {data.recentPayments.length === 0 ? (
            <EmptyState icon="💰" title="No payments yet" description="Payments from your tenants will appear here." />
          ) : (
            <div className="table-wrap">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <p className="font-semibold">{p.tenantName}</p>
                        <p className="text-xs text-slate-500">{p.buildingName} · {p.unitNumber}</p>
                      </td>
                      <td className="font-semibold">{formatKSh(p.amount)}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className="text-slate-500">{formatDateTime(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
