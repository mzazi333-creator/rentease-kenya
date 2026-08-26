import Image from "next/image";
import Link from "next/link";
import { getTenantDashboard } from "@/lib/services/dashboard-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import { formatKSh, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TenantMyHousePage() {
  const user = await requireRole("TENANT");
  const data = await getTenantDashboard({ id: user.id, role: user.role });

  if (!data.tenancy) {
    return (
      <div>
        <PageHeader title="My House" />
        <EmptyState
          icon="🏠"
          title="No house assigned yet"
          description="Once your application is approved you'll see your house here."
          action={<Link href="/rentals" className="btn-primary">Browse rentals</Link>}
        />
      </div>
    );
  }

  const t = data.tenancy;

  return (
    <div>
      <PageHeader title="My House" description="Your current tenancy." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card card-pad">
          <h2 className="text-lg font-bold text-slate-900">{t.building.name}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{t.building.location}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Floor</dt><dd className="font-semibold">{t.floorName}</dd></div>
            <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">House</dt><dd className="font-semibold">{t.unitNumber}</dd></div>
            <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Monthly rent</dt><dd className="font-semibold text-brand-700">{formatKSh(t.monthlyRent)}</dd></div>
            <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Rent due</dt><dd className="font-semibold">{t.building.defaultDueDay}th of every month</dd></div>
            <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Tenancy started</dt><dd className="font-semibold">{formatDate(t.startedAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Landlord contact</dt><dd className="font-semibold">{t.building.contactPhone}</dd></div>
          </dl>
        </div>

        <div className="card card-pad">
          <h2 className="text-lg font-bold text-slate-900">House photos</h2>
          {t.unitImages.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No photos uploaded for this house yet.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {t.unitImages.map((img) => (
                <div key={img.url} className="relative h-36 overflow-hidden rounded-lg">
                  <Image src={img.url} alt="House" fill className="object-cover" sizes="40vw" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
