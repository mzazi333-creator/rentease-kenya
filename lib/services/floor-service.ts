import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { toServiceError, type Actor } from "@/lib/services/auth-service";
import { assertBuildingOwner } from "@/lib/services/building-service";

export async function addFloor(actor: Actor, buildingId: string, name: string, sortOrder?: number) {
  const building = await assertBuildingOwner(actor, buildingId);
  const trimmed = name.trim();
  if (!trimmed) throw toServiceError("Floor name is required");

  const existing = await prisma.floor.findFirst({
    where: { buildingId, name: trimmed },
  });
  if (existing) throw toServiceError(`A floor named "${trimmed}" already exists in this building.`);

  const floor = await prisma.floor.create({
    data: {
      buildingId,
      name: trimmed,
      sortOrder: sortOrder ?? (await prisma.floor.count({ where: { buildingId } })),
    },
  });

  await prisma.building.update({
    where: { id: buildingId },
    data: { numberOfFloors: building.floors.length + 1 },
  });

  await logAudit({
    userId: actor.id,
    action: "FLOOR_ADDED",
    entity: "Floor",
    entityId: floor.id,
    metadata: { buildingId, name: trimmed },
  });
  return floor;
}

export async function renameFloor(actor: Actor, floorId: string, name: string) {
  const floor = await prisma.floor.findUnique({ where: { id: floorId }, include: { building: true } });
  if (!floor) throw toServiceError("Floor not found.");
  await assertBuildingOwner(actor, floor.buildingId);
  const trimmed = name.trim();
  if (!trimmed) throw toServiceError("Floor name is required");

  const dup = await prisma.floor.findFirst({
    where: { buildingId: floor.buildingId, name: trimmed, id: { not: floorId } },
  });
  if (dup) throw toServiceError(`A floor named "${trimmed}" already exists in this building.`);

  const updated = await prisma.floor.update({ where: { id: floorId }, data: { name: trimmed } });
  await logAudit({
    userId: actor.id,
    action: "FLOOR_RENAMED",
    entity: "Floor",
    entityId: floorId,
    metadata: { buildingId: floor.buildingId, from: floor.name, to: trimmed },
  });
  return updated;
}

export async function deleteFloor(actor: Actor, floorId: string) {
  const floor = await prisma.floor.findUnique({ where: { id: floorId }, include: { _count: { select: { units: true } } } });
  if (!floor) throw toServiceError("Floor not found.");
  await assertBuildingOwner(actor, floor.buildingId);

  if (floor._count.units > 0) {
    throw toServiceError(
      "This floor still has units. Delete or move the units before removing the floor."
    );
  }

  await prisma.floor.delete({ where: { id: floorId } });
  const building = await prisma.building.findUnique({ where: { id: floor.buildingId } });
  if (building) {
    const remaining = await prisma.floor.count({ where: { buildingId: building.id } });
    await prisma.building.update({
      where: { id: building.id },
      data: { numberOfFloors: Math.max(1, remaining) },
    });
  }

  await logAudit({
    userId: actor.id,
    action: "FLOOR_DELETED",
    entity: "Floor",
    entityId: floorId,
    metadata: { buildingId: floor.buildingId },
  });
  return { message: "Floor deleted." };
}

export async function listFloorsWithUnits(buildingId: string) {
  return prisma.floor.findMany({
    where: { buildingId },
    orderBy: { sortOrder: "asc" },
    include: {
      units: {
        orderBy: { unitNumber: "asc" },
        include: {
          images: true,
          tenancies: { where: { status: "ACTIVE" }, include: { tenant: { select: { fullName: true } } } },
        },
      },
    },
  });
}
