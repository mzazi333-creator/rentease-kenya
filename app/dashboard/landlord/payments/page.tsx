import { listLandlordPayments } from "@/lib/services/payment-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatKSh, formatDateTime, monthName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LandlordPaymentsPage() {
  const user = await requireRole("LANDLORD");
  const payments = await listLandlordPayments({ id: user.id, role: user.role });

  const pending = payments.filter((p) => p.status === "PENDING_CONFIRMATION");
  const confirmed = payments.filter((p) => p.status === "CONFIRMED");
  const rejected = payments.filter((p) => p.status === "REJECTED");

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Rent payments from your tenants, across all buildings."
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="card card-pad">
          <p className="text-xs font-semibold text-slate-500">Awaiting confirmation</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{pending.length}</p>
        </div>
        <div className="card card-pad">
          <p className="text-xs font-semibold text-slate-500">Confirmed</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{confirmed.length}</p>
        </div>
        <div className="card card-pad">
          <p className="text-xs font-semibold text-slate-500">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{rejected.length}</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon="💰"
          title="No payments yet"
          description="Once your tenants submit M-Pesa transaction codes, payments will show here."
        />
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>House</th>
                <th>Period</th>
                <th>Amount</th>
                <th>M-Pesa Code</th>
                <th>Submitted</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p className="font-semibold">{p.tenant.fullName}</p>
                    <p className="text-xs text-slate-500">{p.tenant.phone}</p>
                  </td>
                  <td>
                    <p className="font-semibold">{p.building.name}</p>
                    <p className="text-xs text-slate-500">House {p.unit.unitNumber}</p>
                  </td>
                  <td>{monthName(p.month)} {p.year}</td>
                  <td className="font-semibold">{formatKSh(p.amount)}</td>
                  <td className="font-mono text-xs">{p.transactionCode}</td>
                  <td className="text-slate-500">{formatDateTime(p.createdAt)}</td>
                  <td>
                    <StatusBadge status={p.status} />
                    {p.rejectionReason && (
                      <p className="mt-1 max-w-[180px] text-[11px] text-red-600">{p.rejectionReason}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
