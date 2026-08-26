import Link from "next/link";
import { getTenantDashboard } from "@/lib/services/dashboard-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatKSh, formatDate, monthName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TenantRentPage() {
  const user = await requireRole("TENANT");
  const data = await getTenantDashboard({ id: user.id, role: user.role });

  if (!data.tenancy || !data.rent) {
    return (
      <div>
        <PageHeader title="Rent" />
        <EmptyState
          icon="💰"
          title="No active tenancy"
          description="Rent details will appear once you're assigned a house."
          action={<Link href="/rentals" className="btn-primary">Find a house</Link>}
        />
      </div>
    );
  }

  const { rent, settings } = data;

  return (
    <div>
      <PageHeader title="Rent" description={`${monthName(rent.month)} ${rent.year} statement`} />

      <div className="card card-pad mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Monthly Rent</p>
            <p className="mt-1 text-3xl font-extrabold text-brand-700">{formatKSh(data.tenancy.monthlyRent)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Due Date</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{formatDate(rent.dueDate)}</p>
            <p className="text-xs text-slate-500">Every {data.tenancy.building.defaultDueDay}th of the month</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Payment Status</p>
            <div className="mt-2"><StatusBadge status={rent.status} /></div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card card-pad">
          <h2 className="text-lg font-bold text-slate-900">M-Pesa Payment Instructions</h2>
          <p className="mt-2 text-sm text-slate-600">{settings.paymentInstructions}</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-slate-500">Paybill Number</span>
              <span className="font-mono font-bold text-slate-900">{settings.mpesaPaybill}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-slate-500">Till Number</span>
              <span className="font-mono font-bold text-slate-900">{settings.mpesaTill}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-slate-500">Account Number</span>
              <span className="font-mono font-bold text-slate-900">{settings.mpesaAccount}</span>
            </div>
          </div>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Go to M-Pesa &gt; Lipa na M-Pesa</li>
            <li>Enter the {settings.mpesaPaybill !== "000000" ? "Paybill" : "Till"} number above</li>
            <li>Enter the exact amount (KSh {Number(data.tenancy.monthlyRent).toLocaleString()})</li>
            <li>Enter your account number and PIN to pay</li>
            <li>You&apos;ll receive an SMS with a transaction code</li>
            <li>Submit that code below</li>
          </ol>
          <Link href="/dashboard/tenant/payments" className="btn-primary mt-5 w-full">
            Submit My Payment
          </Link>
        </div>

        <div className="card card-pad">
          <h2 className="text-lg font-bold text-slate-900">Need help?</h2>
          <p className="mt-2 text-sm text-slate-600">
            If your payment is not confirmed within 24 hours, contact our support team or your landlord.
          </p>
          <p className="mt-3 text-sm">
            Landlord:{" "}
            <a href={`tel:${data.tenancy.building.contactPhone}`} className="font-semibold text-brand-600 hover:underline">
              {data.tenancy.building.contactPhone}
            </a>
          </p>
          <p className="mt-1 text-sm">
            Support:{" "}
            <a href="tel:+254700000000" className="font-semibold text-brand-600 hover:underline">
              +254 700 000 000
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
