import Link from "next/link";
import {
  rentCollectedReport,
  pendingPaymentsReport,
  occupancyReport,
  landlordOverviewReport,
  summaryReport,
} from "@/lib/services/report-service";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatKSh, formatDate, monthName } from "@/lib/utils";
import type { Actor } from "@/lib/services/auth-service";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; buildingId?: string; landlordId?: string; status?: string }>;
}) {
  const user = await requireRole("ADMIN");
  const actor: Actor = { id: user.id, role: user.role };
  const sp = await searchParams;

  const filters = {
    from: sp.from ? new Date(sp.from) : undefined,
    to: sp.to ? new Date(sp.to) : undefined,
    buildingId: sp.buildingId,
    landlordId: sp.landlordId,
    status: sp.status as "CONFIRMED" | "PENDING_CONFIRMATION" | "REJECTED" | undefined,
  };

  const [collected, pending, occupancy, landlords, summary, buildings, landlordProfiles] = await Promise.all([
    rentCollectedReport(actor, filters),
    pendingPaymentsReport(actor, filters),
    occupancyReport(actor, filters),
    landlordOverviewReport(actor),
    summaryReport(actor),
    prisma.building.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.landlordProfile.findMany({
      include: { user: { select: { id: true, fullName: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Reports" description="Platform analytics with filters." />

      {/* Filters */}
      <form className="card card-pad mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="GET" action="/admin/reports">
        <div>
          <label className="label">From</label>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className="input" />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Building</label>
          <select name="buildingId" defaultValue={sp.buildingId ?? ""} className="input">
            <option value="">All buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Landlord</label>
          <select name="landlordId" defaultValue={sp.landlordId ?? ""} className="input">
            <option value="">All landlords</option>
            {landlordProfiles.map((l) => (
              <option key={l.id} value={l.id}>{l.user.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Payment status</label>
          <select name="status" defaultValue={sp.status ?? ""} className="input">
            <option value="">Confirmed</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING_CONFIRMATION">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-5">
          <button type="submit" className="btn-primary">Apply filters</button>
          {(sp.from || sp.to || sp.buildingId || sp.landlordId || sp.status) && (
            <Link href="/admin/reports" className="btn-secondary ml-2">Reset</Link>
          )}
        </div>
      </form>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={`Collected (${monthName(summary.month)})`} value={formatKSh(summary.collectedThisMonth)} sub={`${summary.collectedCount} confirmed payments`} accent="green" />
        <StatCard label="Pending Confirmations" value={summary.pendingCount} accent="amber" />
        <StatCard label="Overdue" value={summary.overdueCount} sub={formatKSh(summary.overdueExpected)} accent="red" />
        <StatCard label="Occupancy" value={`${summary.occupied}/${summary.unitsTotal} units`} sub={`${summary.vacant} vacant`} accent="blue" />
      </div>

      {/* Rent collected */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Rent Collected</h2>
        {collected.payments.length === 0 ? (
          <EmptyState icon="💰" title="No payments in this range" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Building / House</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {collected.payments.slice(0, 50).map((p) => (
                    <tr key={p.id}>
                      <td className="font-semibold">{p.tenant.fullName}</td>
                      <td>{p.building.name} · {p.unit.unitNumber}</td>
                      <td className="font-semibold">{formatKSh(p.amount)}</td>
                      <td className="text-slate-500">{formatDate(p.paymentDate)}</td>
                      <td><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Total: <span className="text-brand-700">{formatKSh(collected.total)}</span> ({collected.count} payments)
            </p>
          </>
        )}
      </section>

      {/* Pending payments */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Pending Payments</h2>
        {pending.length === 0 ? (
          <EmptyState icon="✅" title="Nothing pending" />
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Building / House</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold">{p.tenant.fullName}</td>
                    <td>{p.building.name} · {p.unit.unitNumber}</td>
                    <td className="font-semibold">{formatKSh(p.amount)}</td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Occupancy */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Occupancy by Building</h2>
        {occupancy.length === 0 ? (
          <EmptyState icon="🏢" title="No buildings" />
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Building</th>
                  <th>Total</th>
                  <th>Occupied</th>
                  <th>Vacant</th>
                  <th>Occupancy Rate</th>
                </tr>
              </thead>
              <tbody>
                {occupancy.map((o) => (
                  <tr key={o.buildingId}>
                    <td className="font-semibold">{o.building}</td>
                    <td>{o.total}</td>
                    <td className="text-blue-700 font-semibold">{o.occupied}</td>
                    <td className="text-green-700 font-semibold">{o.vacant}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full bg-brand-500" style={{ width: `${o.occupancyRate}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{o.occupancyRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Landlord overview */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Landlord Overview</h2>
        {landlords.length === 0 ? (
          <EmptyState icon="👥" title="No landlords" />
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Landlord</th>
                  <th>Buildings</th>
                  <th>Units</th>
                  <th>Occupied</th>
                  <th>Expected Monthly</th>
                </tr>
              </thead>
              <tbody>
                {landlords.map((l) => (
                  <tr key={l.landlordId}>
                    <td>
                      <p className="font-semibold">{l.name}</p>
                      <p className="text-xs text-slate-500">{l.phone}</p>
                    </td>
                    <td>{l.buildings}</td>
                    <td>{l.units}</td>
                    <td className="text-blue-700 font-semibold">{l.occupied}</td>
                    <td className="font-semibold">{formatKSh(l.expectedMonthly)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
