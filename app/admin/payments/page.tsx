import Link from "next/link";
import { listAdminPayments } from "@/lib/services/payment-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import AdminPaymentActions from "@/components/admin/AdminPaymentActions";
import { formatKSh, formatDateTime, monthName } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusTabs = [
  { value: "", label: "All" },
  { value: "PENDING_CONFIRMATION", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "REJECTED", label: "Rejected" },
];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const status = sp.status ?? "";

  const payments = await listAdminPayments({
    status: status ? (status as never) : undefined,
  });

  const pendingCount = payments.filter((p) => p.status === "PENDING_CONFIRMATION").length;

  return (
    <div>
      <PageHeader
        title="Payment Verification"
        description={pendingCount > 0 ? `${pendingCount} payment(s) awaiting confirmation.` : "No pending payments."}
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {statusTabs.map((t) => (
          <Link
            key={t.value}
            href={t.value ? `/admin/payments?status=${t.value}` : "/admin/payments"}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              status === t.value ? "bg-brand-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {payments.length === 0 ? (
        <EmptyState icon="💰" title="No payments found" description="Tenant M-Pesa submissions will appear here." />
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>House</th>
                <th>Landlord</th>
                <th>Amount</th>
                <th>M-Pesa Code</th>
                <th>Payment Date</th>
                <th>Month</th>
                <th>Status</th>
                <th>Actions</th>
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
                  <td className="text-slate-500">—</td>
                  <td className="font-semibold">{formatKSh(p.amount)}</td>
                  <td className="font-mono text-xs">{p.transactionCode}</td>
                  <td className="text-slate-500">{formatDateTime(p.paymentDate)}</td>
                  <td className="font-semibold">{monthName(p.month)} {p.year}</td>
                  <td>
                    <StatusBadge status={p.status} />
                    {p.rejectionReason && (
                      <p className="mt-1 max-w-[160px] text-[11px] text-red-600">{p.rejectionReason}</p>
                    )}
                  </td>
                  <td>
                    <AdminPaymentActions paymentId={p.id} status={p.status} />
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
