import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBuildingAdmin } from "@/lib/services/admin-service";
import { requireRole } from "@/lib/guards";
import { PageHeader } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import AdminBuildingActions from "@/components/admin/AdminBuildingActions";
import { formatKSh, unitStatusLabels, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminBuildingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;
  const building = await getBuildingAdmin(id);
  if (!building) notFound();

  const unitCount = building.floors.reduce((s, f) => s + f.units.length, 0);
  const vacant = building.floors.reduce(
    (s, f) => s + f.units.filter((u) => u.availability === "VACANT").length,
    0
  );

  return (
    <div>
      <PageHeader
        title={building.name}
        description={`${building.town}, ${building.county} · ${building.propertyType}`}
        actions={
          <>
            <StatusBadge status={building.status} />
            <AdminBuildingActions buildingId={building.id} status={building.status} />
            <Link href={`/rentals/${building.id}`} className="btn-secondary">Public view</Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card card-pad">
            <h2 className="text-lg font-bold text-slate-900">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{building.description}</p>
          </div>

          {building.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {building.images.map((img) => (
                <div key={img.id} className="relative h-20 overflow-hidden rounded-lg sm:h-24">
                  <Image src={img.url} alt={img.alt ?? building.name} fill className="object-cover" sizes="20vw" />
                </div>
              ))}
            </div>
          )}

          <h2 className="text-lg font-bold text-slate-900">Full Structure ({unitCount} units, {vacant} vacant)</h2>
          {building.floors.map((floor) => (
            <div key={floor.id} className="card card-pad">
              <h3 className="font-bold text-slate-900">{floor.name}</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {floor.units.map((unit) => (
                  <div key={unit.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{unit.unitNumber}</span>
                      <StatusBadge status={unit.availability} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-brand-700">{formatKSh(unit.monthlyRent)}/mo</p>
                    <p className="text-xs text-slate-500">
                      {unit.bedrooms} bd · {unit.bathrooms} ba · {unitStatusLabels[unit.availability as keyof typeof unitStatusLabels]}
                    </p>
                    {unit.depositAmount && <p className="text-xs text-slate-400">Deposit: {formatKSh(unit.depositAmount)}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="card card-pad">
            <h3 className="font-bold text-slate-900">Landlord</h3>
            <p className="mt-2 font-semibold">{building.landlord.user.fullName}</p>
            <p className="text-sm text-slate-500">{building.landlord.user.email}</p>
            <p className="text-sm text-slate-500">{building.landlord.user.phone}</p>
          </div>
          <div className="card card-pad">
            <h3 className="font-bold text-slate-900">Details</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Location</dt><dd className="font-semibold">{building.location}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Address</dt><dd className="text-right font-semibold">{building.exactAddress}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Contact</dt><dd className="font-semibold">{building.contactPhone}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Floors</dt><dd className="font-semibold">{building.numberOfFloors}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Rent due day</dt><dd className="font-semibold">{building.defaultDueDay}th</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Submitted</dt><dd className="font-semibold">{formatDateTime(building.createdAt)}</dd></div>
              {building.reviewedAt && (
                <div className="flex justify-between"><dt className="text-slate-500">Reviewed</dt><dd className="font-semibold">{formatDateTime(building.reviewedAt)}</dd></div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
