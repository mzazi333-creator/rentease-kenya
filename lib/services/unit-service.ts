import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { toServiceError, type Actor } from "@/lib/services/auth-service";
import { assertBuildingOwner } from "@/lib/services/building-service";
import { unitSchema } from "@/lib/validations/building";
import type { UnitAvailability } from "@prisma/client";

export interface UnitImageInput {
  url: string;
  alt?: string;
  kind?: string;
}

export interface UpsertUnitInput {
  unitNumber: string;
  monthlyRent: number;
  depositAmount?: number;
  bedrooms?: number;
  bathrooms?: number;
  description?: string;
  availability?: UnitAvailability;
  amenities?: string[];
}

async function getUnitOrThrow(unitId: string) {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { building: true, floor: true, images: true },
  });
  if (!unit) throw toServiceError("Unit not found.");
  return unit;
}

export async function createUnit(
  actor: Actor,
  buildingId: string,
  floorId: string,
  input: UpsertUnitInput,
  images?: UnitImageInput[]
) {
  await assertBuildingOwner(actor, buildingId);
  const parsed = unitSchema.safeParse({ ...input, buildingId, floorId });
  if (!parsed.success) throw toServiceError(parsed.error.issues[0]?.message ?? "Invalid unit details");
  const data = parsed.data;

  const floor = await prisma.floor.findFirst({ where: { id: floorId, buildingId } });
  if (!floor) throw toServiceError("Floor not found in this building.");

  const dup = await prisma.unit.findFirst({ where: { floorId, unitNumber: data.unitNumber } });
  if (dup) throw toServiceError(`Unit "${data.unitNumber}" already exists on this floor.`);

  const unit = await prisma.unit.create({
    data: {
      buildingId,
      floorId,
      unitNumber: data.unitNumber,
      monthlyRent: data.monthlyRent,
      depositAmount: data.depositAmount ? data.depositAmount : null,
      bedrooms: data.bedrooms ?? 1,
      bathrooms: data.bathrooms ?? 1,
      description: data.description || null,
      availability: data.availability ?? "VACANT",
      amenities: data.amenities ?? [],
      images: images?.length ? { create: images.map((img, i) => ({ ...img, sortOrder: i })) } : undefined,
    },
  });

  await logAudit({
    userId: actor.id,
    action: "UNIT_ADDED",
    entity: "Unit",
    entityId: unit.id,
    metadata: { buildingId, floorId, unitNumber: data.unitNumber, monthlyRent: data.monthlyRent },
  });
  return unit;
}

export async function updateUnit(
  actor: Actor,
  unitId: string,
  input: UpsertUnitInput,
  images?: UnitImageInput[]
) {
  const unit = await getUnitOrThrow(unitId);
  await assertBuildingOwner(actor, unit.buildingId);

  const parsed = unitSchema.safeParse({
    ...input,
    buildingId: unit.buildingId,
    floorId: unit.floorId,
  });
  if (!parsed.success) throw toServiceError(parsed.error.issues[0]?.message ?? "Invalid unit details");
  const data = parsed.data;

  const dup = await prisma.unit.findFirst({
    where: { floorId: unit.floorId, unitNumber: data.unitNumber, id: { not: unitId } },
  });
  if (dup) throw toServiceError(`Unit "${data.unitNumber}" already exists on this floor.`);

  const rentChanged = Number(unit.monthlyRent) !== data.monthlyRent;

  const updated = await prisma.unit.update({
    where: { id: unitId },
    data: {
      unitNumber: data.unitNumber,
      monthlyRent: data.monthlyRent,
      depositAmount: data.depositAmount ? data.depositAmount : null,
      bedrooms: data.bedrooms ?? 1,
      bathrooms: data.bathrooms ?? 1,
      description: data.description || null,
      availability: data.availability ?? unit.availability,
      amenities: data.amenities ?? unit.amenities,
    },
  });

  if (images && images.length > 0) {
    for (const img of images) {
      await prisma.propertyImage.create({
        data: { ...img, unitId, buildingId: unit.buildingId },
      });
    }
  }

  await logAudit({
    userId: actor.id,
    action: "UNIT_UPDATED",
    entity: "Unit",
    entityId: unitId,
    metadata: {
      buildingId: unit.buildingId,
      unitNumber: data.unitNumber,
      rentChanged,
      previousRent: unit.monthlyRent.toString(),
      newRent: data.monthlyRent,
      availability: data.availability,
    },
  });
  return updated;
}

export async function updateUnitAvailability(
  actor: Actor,
  unitId: string,
  availability: UnitAvailability
) {
  const unit = await getUnitOrThrow(unitId);
  await assertBuildingOwner(actor, unit.buildingId);

  if (availability === "VACANT") {
    const active = await prisma.tenancy.findFirst({ where: { unitId, status: "ACTIVE" } });
    if (active) {
      throw toServiceError("This unit has an active tenant. Move the tenant out before marking it vacant.");
    }
  }

  const updated = await prisma.unit.update({ where: { id: unitId }, data: { availability } });
  await logAudit({
    userId: actor.id,
    action: "UNIT_AVAILABILITY_CHANGED",
    entity: "Unit",
    entityId: unitId,
    metadata: { buildingId: unit.buildingId, availability },
  });
  return updated;
}

export async function deleteUnit(actor: Actor, unitId: string) {
  const unit = await getUnitOrThrow(unitId);
  await assertBuildingOwner(actor, unit.buildingId);

  const tenancies = await prisma.tenancy.count({ where: { unitId } });
  if (tenancies > 0) {
    throw toServiceError("This unit has tenancy history and cannot be deleted.");
  }
  const payments = await prisma.payment.count({ where: { unitId } });
  if (payments > 0) {
    throw toServiceError("This unit has payment records and cannot be deleted.");
  }

  await prisma.unit.delete({ where: { id: unitId } });
  await logAudit({
    userId: actor.id,
    action: "UNIT_DELETED",
    entity: "Unit",
    entityId: unitId,
    metadata: { buildingId: unit.buildingId, unitNumber: unit.unitNumber },
  });
  return { message: "Unit deleted." };
}

export async function getUnitWithDetails(unitId: string) {
  return getUnitOrThrow(unitId);
}
