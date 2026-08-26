import { listOverdueTenancies } from "@/lib/services/payment-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState, StatCard } from "@/components/ui/Layout";
import { formatKSh, monthName } from "@/lib/utils";
import { currentMonthYear } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOverduePage() {
  await requireRole("ADMIN");
  const overdue = await listOverdueTenancies();
  const { month, year } = currentMonthYear();

  const totalExpected = overdue.reduce((s, t) => s + Number(t.unit.monthlyRent), 0);

  return (
    <div>
      <PageHeader
        title="Overdue Rent"
        description={`Tenancies without a confirmed payment for ${monthName(month)} ${year} past the due date.`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 max-w-md">
        <StatCard label="Overdue Tenants" value={overdue.length} accent={overdue.length > 0 ? "red" : "green"} />
        <StatCard label="Expected Rent" value={formatKSh(totalExpected)} accent="red" />
      </div>

      {overdue.length === 0 ? (
        <EmptyState icon="✅" title="No overdue payments" description="Every active tenancy is up to date for this month." />
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>House</th>
                <th>Monthly Rent</th>
                <th>Due Day</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {overdue.map((t) => (
                <tr key={t.id}>
                  <td className="font-semibold">{t.tenant.fullName}</td>
                  <td>
                    {t.building.name} · {t.unit.unitNumber}
                  </td>
                  <td className="font-semibold text-red-600">{formatKSh(t.unit.monthlyRent)}</td>
                  <td>{t.building.defaultDueDay}th</td>
                  <td className="text-slate-500">{t.tenant.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
