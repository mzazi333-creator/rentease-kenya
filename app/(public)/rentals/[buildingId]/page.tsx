import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublicBuilding } from "@/lib/services/search-service";
import { getSessionUser } from "@/lib/auth";
import { formatKSh } from "@/lib/utils";
import ApplyButton from "@/components/rentals/ApplyButton";
import { unitStatusLabels } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}): Promise<Metadata> {
  const { buildingId } = await params;
  const building = await getPublicBuilding(buildingId);
  return { title: building ? building.name : "Building not found" };
}

export default async function BuildingDetailsPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const { buildingId } = await params;
  const building = await getPublicBuilding(buildingId);
  if (!building) notFound();

  const user = await getSessionUser();

  return (
    <div className="container-page py-10">
      {/* Gallery */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="relative h-64 overflow-hidden rounded-2xl lg:col-span-2 lg:h-96">
          {building.images[0] ? (
            <Image
              src={building.images[0].url}
              alt={building.images[0].alt ?? building.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 text-6xl">
              🏢
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {building.images.slice(1, 3).map((img, i) => (
            <div key={i} className="relative h-36 overflow-hidden rounded-xl lg:h-[11.75rem]">
              <Image src={img.url} alt={img.alt ?? building.name} fill className="object-cover" sizes="30vw" />
            </div>
          ))}
          {building.images.length === 1 && (
            <div className="flex h-36 items-center justify-center rounded-xl bg-slate-100 text-4xl lg:h-[11.75rem]">
              🏠
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-brand-100 text-brand-800">{building.propertyType}</span>
            <span className="badge bg-green-100 text-green-800">
              {building.vacantUnits} vacant house{building.vacantUnits === 1 ? "" : "s"}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{building.name}</h1>
          <p className="mt-1 text-slate-500">
            {building.town}, {building.county} · {building.location} · {building.numberOfFloors} floors
          </p>
        </div>
        <div className="card card-pad max-w-sm shrink-0">
          <p className="text-xs font-semibold uppercase text-slate-400">Property contact</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{building.landlordName}</p>
          {building.contactPhone && (
            <a href={`tel:${building.contactPhone}`} className="mt-0.5 block text-sm text-brand-600 hover:underline">
              {building.contactPhone}
            </a>
          )}
          {building.contactEmail && (
            <a href={`mailto:${building.contactEmail}`} className="block text-sm text-brand-600 hover:underline">
              {building.contactEmail}
            </a>
          )}
          <p className="mt-2 text-xs text-slate-400">{building.exactAddress}</p>
        </div>
      </div>

      {/* Description */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900">About this building</h2>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-600">{building.description}</p>

          <h2 className="mt-8 text-lg font-bold text-slate-900">Houses & Availability</h2>
          <div className="mt-3 space-y-5">
            {building.floors.map((floor) => (
              <div key={floor.id} className="card card-pad">
                <h3 className="font-bold text-slate-900">{floor.name}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {floor.units.map((unit) => {
                    const vacant = unit.availability === "VACANT";
                    return (
                      <div
                        key={unit.id}
                        className={`rounded-lg border p-3 ${
                          vacant ? "border-green-200 bg-green-50/60" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{unit.unitNumber}</span>
                          <span
                            className={`badge ${
                              vacant
                                ? "bg-green-100 text-green-800"
                                : unit.availability === "MAINTENANCE"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {unitStatusLabels[unit.availability as keyof typeof unitStatusLabels]}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-brand-700">{formatKSh(unit.monthlyRent)}/mo</p>
                        <p className="text-xs text-slate-500">
                          {unit.bedrooms} bd · {unit.bathrooms} ba
                          {unit.depositAmount && Number(unit.depositAmount) > 0
                            ? ` · deposit ${formatKSh(unit.depositAmount)}`
                            : ""}
                        </p>
                        {unit.amenities.length > 0 && (
                          <p className="mt-1 text-xs text-slate-400">{unit.amenities.join(", ")}</p>
                        )}
                        {vacant && (
                          <div className="mt-2.5">
                            <ApplyButton
                              unitId={unit.id}
                              floorId={floor.id}
                              buildingId={building.id}
                              unitNumber={unit.unitNumber}
                              rent={unit.monthlyRent}
                              isLoggedIn={!!user}
                              role={user?.role}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar summary */}
        <div className="space-y-4">
          <div className="card card-pad">
            <h3 className="font-bold text-slate-900">Building summary</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Floors</dt><dd className="font-semibold">{building.numberOfFloors}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Vacant houses</dt><dd className="font-semibold text-green-700">{building.vacantUnits}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Location</dt><dd className="font-semibold">{building.town}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">County</dt><dd className="font-semibold">{building.county}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd className="font-semibold">{building.propertyType}</dd></div>
            </dl>
          </div>
          <div className="card card-pad bg-brand-50">
            <h3 className="font-bold text-brand-900">Need help?</h3>
            <p className="mt-1 text-sm text-brand-800">
              Call us at{" "}
              <a href="tel:+254700000000" className="font-semibold underline">
                +254 700 000 000
              </a>{" "}
              or email support@rentease.co.ke.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
