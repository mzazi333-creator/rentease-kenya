import Link from "next/link";
import { adminDashboardStats } from "@/lib/services/admin-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, StatCard } from "@/components/ui/Layout";
import { currentMonthYear, monthName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireRole("ADMIN");
  const stats = await adminDashboardStats();
  const { month, year } = currentMonthYear();

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description={`Platform overview for ${monthName(month)} ${year}.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Users" value={stats.totalUsers} sub={`${stats.landlords} landlords · ${stats.tenants} tenants`} accent="blue" />
        <StatCard label="Buildings" value={stats.buildings} sub={`${stats.approvedBuildings} approved · ${stats.pendingBuildings} pending`} accent="green" />
        <StatCard label="Occupied Units" value={stats.occupiedUnits} sub={`${stats.vacantUnits} vacant`} accent="slate" />
        <StatCard label="Payments This Month" value={stats.paymentsThisMonth} sub={`${stats.pendingPayments} awaiting confirmation`} accent="amber" />
        <StatCard label="Overdue Payments" value={stats.overduePayments} accent={stats.overduePayments > 0 ? "red" : "slate"} />
        <StatCard label="Pending Applications" value={stats.pendingApplications} accent="amber" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/buildings?status=PENDING_APPROVAL" className="card card-pad transition-shadow hover:shadow-md">
          <h3 className="font-bold text-slate-900">🕐 Pending Building Approvals</h3>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">{stats.pendingBuildings}</p>
          <p className="mt-1 text-sm text-slate-500">Review and approve new buildings →</p>
        </Link>
        <Link href="/admin/payments" className="card card-pad transition-shadow hover:shadow-md">
          <h3 className="font-bold text-slate-900">💰 Payment Verification</h3>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">{stats.pendingPayments}</p>
          <p className="mt-1 text-sm text-slate-500">Confirm or reject M-Pesa payments →</p>
        </Link>
        <Link href="/admin/tenants" className="card card-pad transition-shadow hover:shadow-md">
          <h3 className="font-bold text-slate-900">📋 Tenant Applications</h3>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">{stats.pendingApplications}</p>
          <p className="mt-1 text-sm text-slate-500">Approve new tenants →</p>
        </Link>
      </div>
    </div>
  );
}
