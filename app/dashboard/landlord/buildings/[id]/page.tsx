import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { assertBuildingOwner } from "@/lib/services/building-service";
import { requireRole } from "@/lib/guards";
import { PageHeader } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import ActionButton from "@/components/ui/ActionButton";
import UnitFormModal from "@/components/buildings/UnitFormModal";
import FloorManager from "@/components/buildings/FloorManager";
import BuildingActions from "@/components/buildings/BuildingActions";
import { formatKSh, unitStatusLabels } from "@/lib/utils";
import {
  deleteBuildingAction,
  resubmitBuildingAction,
  updateUnitAvailabilityAction,
  deleteUnitAction,
  deleteFloorAction,
} from "@/app/actions/buildings";

export const dynamic = "force-dynamic";

export default async function LandlordBuildingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("LANDLORD");
  const building = await assertBuildingOwner({ id: user.id, role: user.role }, id);
  if (!building) notFound();

  const floors = await prisma.floor.findMany({
    where: { buildingId: id },
    orderBy: { sortOrder: "asc" },
    include: {
      units: {
        orderBy: { unitNumber: "asc" },
        include: {
          images: true,
          tenancies: { where: { status: "ACTIVE" }, include: { tenant: { select: { id: true, fullName: true, phone: true } } } },
        },
      },
    },
  });

  const images = await prisma.propertyImage.findMany({
    where: { buildingId: id, unitId: null },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <PageHeader
        title={building.name}
        description={`${building.town}, ${building.county} · ${building.propertyType} · Due day: ${building.defaultDueDay}th`}
        actions={
          <>
            <StatusBadge status={building.status} />
            <Link href={`/rentals/${building.id}`} className="btn-secondary">
              Public view
            </Link>
            <BuildingActions buildingId={building.id} status={building.status} />
          </>
        }
      />

      {building.status === "REJECTED" && building.approvalNote && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-bold">Rejection reason:</p>
          <p>{building.approvalNote}</p>
          <p className="mt-1 text-xs">
            Fix the issues and resubmit your building for approval.
          </p>
        </div>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((img) => (
            <div key={img.id} className="relative h-20 overflow-hidden rounded-lg sm:h-24">
              <Image src={img.url} alt={img.alt ?? building.name} fill className="object-cover" sizes="20vw" />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Floors & units */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Structure ({floors.length} floors)</h2>
            <FloorManager buildingId={id} />
          </div>

          {floors.length === 0 && (
            <div className="card card-pad text-center text-sm text-slate-500">
              No floors yet — add your first floor below.
            </div>
          )}

          {floors.map((floor) => (
            <div key={floor.id} className="card card-pad">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-slate-900">{floor.name}</h3>
                <div className="flex gap-1.5">
                  <UnitFormModalTrigger buildingId={id} floorId={floor.id} />
                  <FloorManager.RenameFloor floorId={floor.id} currentName={floor.name} />
                  <ActionButton
                    label="Delete floor"
                    action={() => deleteFloorAction(floor.id)}
                    confirm={`Delete "${floor.name}"? Only empty floors can be deleted.`}
                    confirmLabel="Delete floor"
                    danger
                    className="btn-ghost !px-2.5 !py-1 !text-xs text-red-600"
                  >
                    Delete
                  </ActionButton>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {floor.units.map((unit) => {
                  const activeTenancy = unit.tenancies[0];
                  return (
                    <div key={unit.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{unit.unitNumber}</span>
                        <StatusBadge status={unit.availability} />
                      </div>
                      <p className="mt-1 text-sm font-semibold text-brand-700">
                        {formatKSh(unit.monthlyRent)}/mo
                        {unit.depositAmount ? ` · dep ${formatKSh(unit.depositAmount)}` : ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        {unit.bedrooms} bd · {unit.bathrooms} ba · {unitStatusLabels[unit.availability as keyof typeof unitStatusLabels]}
                      </p>
                      {activeTenancy && (
                        <p className="mt-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">
                          👤 {activeTenancy.tenant.fullName} · {activeTenancy.tenant.phone}
                        </p>
                      )}
                      {unit.description && <p className="mt-1 text-xs text-slate-500">{unit.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <UnitFormModalTrigger
                          buildingId={id}
                          floorId={floor.id}
                          unit={{
                            id: unit.id,
                            unitNumber: unit.unitNumber,
                            monthlyRent: unit.monthlyRent.toString(),
                            depositAmount: unit.depositAmount?.toString() ?? null,
                            bedrooms: unit.bedrooms,
                            bathrooms: unit.bathrooms,
                            description: unit.description,
                            availability: unit.availability,
                            amenities: unit.amenities,
                          }}
                        />
                        <AvailabilityButtons unitId={unit.id} availability={unit.availability} />
                        <ActionButton
                          label="Delete unit"
                          action={() => deleteUnitAction(unit.id)}
                          confirm={`Delete house ${unit.unitNumber}? This cannot be undone if it has no tenancy history.`}
                          confirmLabel="Delete house"
                          danger
                          className="btn-ghost !px-2.5 !py-1 !text-xs text-red-600"
                        >
                          Delete
                        </ActionButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card card-pad">
            <h3 className="font-bold text-slate-900">Property details</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Location</dt><dd className="font-semibold">{building.location}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Address</dt><dd className="text-right font-semibold">{building.exactAddress}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Contact</dt><dd className="font-semibold">{building.contactPhone}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Floors</dt><dd className="font-semibold">{building.numberOfFloors}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Units</dt><dd className="font-semibold">{floors.reduce((s, f) => s + f.units.length, 0)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Rent due day</dt><dd className="font-semibold">{building.defaultDueDay}th</dd></div>
            </dl>
          </div>
          <div className="card card-pad">
            <h3 className="font-bold text-slate-900">Description</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{building.description}</p>
          </div>
          <ActionButton
            label="Delete building"
            action={() => deleteBuildingAction(building.id)}
            confirm={`Delete ${building.name}? Buildings with active tenants cannot be deleted.`}
            confirmLabel="Delete building"
            danger
            className="btn-danger w-full"
          >
            Delete Building
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

// Client triggers
import UnitFormModalTrigger from "@/components/buildings/UnitFormModalTrigger";
import AvailabilityButtons from "@/components/buildings/AvailabilityButtons";
