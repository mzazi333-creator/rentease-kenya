import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantPaymentHistoryAdmin, setUserStatus } from "@/lib/services/admin-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import ActionButton from "@/components/ui/ActionButton";
import { setUserStatusAction, moveOutTenantAction } from "@/app/actions/admin";
import MoveTenantModal from "@/components/admin/MoveTenantModal";
import { formatKSh, formatDate, monthName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminTenantDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireRole("ADMIN");
  const { userId } = await params;

  const tenant = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenantProfile: true,
      tenancies: {
        orderBy: { startedAt: "desc" },
        include: {
          building: { select: { id: true, name: true, landlordId: true } },
          floor: { select: { name: true } },
          unit: { select: { id: true, unitNumber: true, monthlyRent: true, availability: true } },
        },
      },
    },
  });
  if (!tenant || tenant.role !== "TENANT") notFound();

  const history = await getTenantPaymentHistoryAdmin(userId);
  const activeTenancy = tenant.tenancies.find((t) => t.status === "ACTIVE");

  // Vacant units in the same building (for the move modal)
  const moveOptions =
    activeTenancy && activeTenancy.unit.availability !== "VACANT"
      ? await prisma.unit.findMany({
          where: { buildingId: activeTenancy.buildingId, availability: "VACANT" },
          orderBy: { unitNumber: "asc" },
        })
      : [];

  return (
    <div>
      <PageHeader
        title={tenant.fullName}
        description={`${tenant.email} · ${tenant.phone} · Registered ${formatDate(tenant.createdAt)}`}
        actions={
          <>
            <StatusBadge status={tenant.status} />
            <ActionButton
              label={tenant.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
              action={() => setUserStatusAction(tenant.id, tenant.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED")}
              confirm={tenant.status === "SUSPENDED" ? "Reactivate this tenant?" : "Suspend this tenant?"}
              confirmLabel={tenant.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
              danger={tenant.status !== "SUSPENDED"}
              className={tenant.status === "SUSPENDED" ? "btn-primary" : "btn-danger"}
            >
              {tenant.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
            </ActionButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card card-pad">
          <h2 className="text-lg font-bold text-slate-900">Current Tenancy</h2>
          {activeTenancy ? (
            <>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Building</dt><dd className="font-semibold">{activeTenancy.building.name}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Floor</dt><dd className="font-semibold">{activeTenancy.floor.name}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">House</dt><dd className="font-semibold">{activeTenancy.unit.unitNumber}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Monthly rent</dt><dd className="font-semibold text-brand-700">{formatKSh(activeTenancy.monthlyRent)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Started</dt><dd className="font-semibold">{formatDate(activeTenancy.startedAt)}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <MoveTenantModal tenancyId={activeTenancy.id} buildingId={activeTenancy.buildingId} options={moveOptions} disabled={moveOptions.length === 0} />
                <ActionButton
                  label="Move out"
                  action={() => moveOutTenantAction(activeTenancy.id, "Moved out by administrator")}
                  confirm={`Move ${tenant.fullName} out of house ${activeTenancy.unit.unitNumber}? History is preserved.`}
                  confirmLabel="Move out"
                  danger
                  className="btn-secondary"
                >
                  Move out of house
                </ActionButton>
              </div>
            </>
          ) : (
            <EmptyState icon="🏠" title="No active tenancy" description="This tenant has no assigned house right now." />
          )}
        </section>

        <section className="card card-pad">
          <h2 className="text-lg font-bold text-slate-900">Profile</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">National ID</dt><dd className="font-semibold">{tenant.nationalId ?? tenant.tenantProfile?.nationalId ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Emergency contact</dt><dd className="font-semibold">{tenant.tenantProfile?.emergencyName ?? "—"} {tenant.tenantProfile?.emergencyContact ? `(${tenant.tenantProfile.emergencyContact})` : ""}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Occupation</dt><dd className="font-semibold">{tenant.tenantProfile?.occupation ?? "—"}</dd></div>
          </dl>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Payment History</h2>
        {history.length === 0 ? (
          <EmptyState icon="💰" title="No payments" description="No payment records for this tenant yet." />
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>M-Pesa Code</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold">{monthName(p.month)} {p.year}</td>
                    <td>{formatKSh(p.amount)}</td>
                    <td className="font-mono text-xs">{p.transactionCode}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="text-slate-500">{formatDate(p.createdAt)}</td>
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
