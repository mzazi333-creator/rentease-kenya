import Link from "next/link";
import { getTenantDashboard } from "@/lib/services/dashboard-service";
import { listTenantPaymentHistory } from "@/lib/services/payment-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import PaymentForm from "@/components/tenants/PaymentForm";
import { formatKSh, monthName, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TenantPaymentsPage() {
  const user = await requireRole("TENANT");
  const [data, history] = await Promise.all([
    getTenantDashboard({ id: user.id, role: user.role }),
    listTenantPaymentHistory({ id: user.id, role: user.role }),
  ]);

  const hasPendingPayment = data.recentPayments.some((p) => p.status === "PENDING_CONFIRMATION");

  return (
    <div>
      <PageHeader title="Payments & History" description="Submit your M-Pesa payment and view your records." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card card-pad">
          <h2 className="text-lg font-bold text-slate-900">Submit Rent Payment</h2>
          {data.tenancy ? (
            <div className="mt-4">
              <PaymentForm
                monthlyRent={data.tenancy.monthlyRent}
                dueDay={data.tenancy.building.defaultDueDay}
                hasPendingPayment={hasPendingPayment}
              />
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon="🏠"
                title="No active tenancy"
                description="You need an assigned house before paying rent."
                action={<Link href="/rentals" className="btn-primary">Browse rentals</Link>}
              />
            </div>
          )}
        </section>

        <section className="card card-pad">
          <h2 className="text-lg font-bold text-slate-900">Payment History</h2>
          {history.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon="📜" title="No payment records yet" description="Every confirmed payment will be kept here forever." />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {history.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <div>
                    <p className="font-bold text-slate-900">
                      {monthName(p.month)} {p.year}
                    </p>
                    <p className="font-semibold text-brand-700">{formatKSh(p.amount)}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">M-Pesa: {p.transactionCode}</p>
                    {p.rejectionReason && (
                      <p className="mt-1 text-xs font-medium text-red-600">Rejected: {p.rejectionReason}</p>
                    )}
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
