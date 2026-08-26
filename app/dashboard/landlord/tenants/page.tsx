import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import ActionButton from "@/components/ui/ActionButton";
import { moveOutTenantAction } from "@/app/actions/admin";
import { formatKSh, formatDate } from "@/lib/utils";
import { computeRentStatuses } from "@/lib/rent-status";

export const dynamic = "force-dynamic";

export default async function LandlordTenantsPage() {
  const user = await requireRole("LANDLORD");
  const profile = await prisma.landlordProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return null;

  const tenancies = await prisma.tenancy.findMany({
    where: { landlordId: profile.id, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
    include: {
      tenant: { select: { id: true, fullName: true, phone: true, email: true } },
      building: { select: { name: true, defaultDueDay: true } },
      floor: { select: { name: true } },
      unit: { select: { unitNumber: true, monthlyRent: true } },
    },
  });

  const statuses = await computeRentStatuses(tenancies);

  return (
    <div>
      <PageHeader
        title="My Tenants"
        description={`${tenancies.length} active tenant${tenancies.length === 1 ? "" : "s"} across your buildings.`}
      />

      {tenancies.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No tenants yet"
          description="When tenants apply for your houses and get approved, they'll appear here."
        />
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>House</th>
                <th>Monthly Rent</th>
                <th>Rent Status</th>
                <th>Since</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenancies.map((t) => {
                const rs = statuses.get(t.id);
                return (
                  <tr key={t.id}>
                    <td>
                      <p className="font-semibold">{t.tenant.fullName}</p>
                      <p className="text-xs text-slate-500">{t.tenant.phone}</p>
                    </td>
                    <td>
                      <p className="font-semibold">{t.building.name}</p>
                      <p className="text-xs text-slate-500">{t.floor.name} · {t.unit.unitNumber}</p>
                    </td>
                    <td className="font-semibold">{formatKSh(t.unit.monthlyRent)}</td>
                    <td><StatusBadge status={rs?.status ?? "PENDING"} /></td>
                    <td className="text-slate-500">{formatDate(t.startedAt)}</td>
                    <td>
                      <ActionButton
                        label="Move out"
                        action={() => moveOutTenantAction(t.id, "")}
                        confirm={`Move ${t.tenant.fullName} out of house ${t.unit.unitNumber}? Their payment history is preserved.`}
                        confirmLabel="Move out"
                        danger
                        className="btn-ghost !px-2.5 !py-1 !text-xs text-red-600"
                      >
                        Move out
                      </ActionButton>
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
