import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { buildingSchema } from "@/lib/validations/building";
import { toServiceError, type Actor } from "@/lib/services/auth-service";
import type { BuildingStatus } from "@prisma/client";

export interface UnitDraftInput {
  unitNumber: string;
  monthlyRent: number;
  depositAmount?: number | null;
  bedrooms?: number;
  bathrooms?: number;
  description?: string;
  availability?: "VACANT" | "OCCUPIED" | "PENDING_APPROVAL" | "MAINTENANCE";
  amenities?: string[];
}

export interface FloorDraftInput {
  name: string;
  sortOrder?: number;
  units: UnitDraftInput[];
}

export interface ImageInput {
  url: string;
  alt?: string;
  kind?: string;
}

export interface CreateBuildingInput {
  building: {
    name: string;
    description: string;
    location: string;
    county: string;
    town: string;
    exactAddress: string;
    contactPhone: string;
    contactEmail?: string;
    propertyType: string;
    numberOfFloors: number;
    defaultDueDay?: number;
  };
  floors: FloorDraftInput[];
  images?: ImageInput[];
}

async function getLandlordProfile(actor: Actor) {
  const profile = await prisma.landlordProfile.findUnique({ where: { userId: actor.id } });
  if (!profile) throw toServiceError("Landlord profile not found. Please complete registration.");
  return profile;
}

/** Assert the actor is the owner of the given building, return the building. */
export async function assertBuildingOwner(actor: Actor, buildingId: string) {
  const profile = await getLandlordProfile(actor);
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    include: { landlord: true, floors: { include: { units: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!building) throw toServiceError("Building not found.");
  if (building.landlordId !== profile.id) {
    throw toServiceError("You do not have permission to access this building.");
  }
  return building;
}

export async function createBuilding(actor: Actor, input: CreateBuildingInput) {
  if (actor.role !== "LANDLORD") throw toServiceError("Only landlords can register buildings.");

  const parsed = buildingSchema.safeParse(input.building);
  if (!parsed.success) throw toServiceError(parsed.error.issues[0]?.message ?? "Invalid building details");

  const landlord = await getLandlordProfile(actor);
  const data = parsed.data;
  const floors = input.floors ?? [];

  // A building must declare its floors (structure comes with registration).
  if (floors.length === 0) {
    throw toServiceError("Please define at least one floor for your building.");
  }

  const building = await prisma.$transaction(async (tx) => {
    const created = await tx.building.create({
      data: {
        name: data.name,
        description: data.description,
        location: data.location,
        county: data.county,
        town: data.town,
        exactAddress: data.exactAddress,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail || null,
        propertyType: data.propertyType,
        numberOfFloors: data.numberOfFloors,
        defaultDueDay: data.defaultDueDay ?? 5,
        landlordId: landlord.id,
        status: "PENDING_APPROVAL",
      },
    });

    let unitCount = 0;
    for (const [fi, f] of floors.entries()) {
      const floor = await tx.floor.create({
        data: { buildingId: created.id, name: f.name, sortOrder: f.sortOrder ?? fi },
      });
      for (const u of f.units ?? []) {
        await tx.unit.create({
          data: {
            buildingId: created.id,
            floorId: floor.id,
            unitNumber: u.unitNumber,
            monthlyRent: u.monthlyRent,
            depositAmount: u.depositAmount && u.depositAmount > 0 ? u.depositAmount : null,
            bedrooms: u.bedrooms ?? 1,
            bathrooms: u.bathrooms ?? 1,
            description: u.description ?? null,
            availability: u.availability ?? "VACANT",
            amenities: u.amenities ?? [],
          },
        });
        unitCount++;
      }
    }

    if (input.images && input.images.length > 0) {
      await tx.propertyImage.createMany({
        data: input.images.map((img, i) => ({
          url: img.url,
          alt: img.alt ?? `${created.name} photo`,
          kind: img.kind ?? "building",
          buildingId: created.id,
          sortOrder: i,
        })),
      });
    }
    return { ...created, floorsCount: floors.length, unitsCount: unitCount };
  });

  await logAudit({
    userId: actor.id,
    action: "BUILDING_SUBMITTED",
    entity: "Building",
    entityId: building.id,
    metadata: { name: building.name, floors: building.floorsCount, units: building.unitsCount },
  });

  // Notify admins
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      type: "BUILDING",
      title: "New building awaiting approval",
      message: `${data.name} was submitted by ${actor.id} and is awaiting your review.`,
      link: "/admin/buildings",
    });
  }

  return building;
}

export async function updateBuilding(actor: Actor, buildingId: string, input: CreateBuildingInput["building"]) {
  const building = await assertBuildingOwner(actor, buildingId);
  if (building.status === "APPROVED") {
    // Approved buildings can still be edited (name, rent, contact), but approval stays.
  }
  const parsed = buildingSchema.safeParse(input);
  if (!parsed.success) throw toServiceError(parsed.error.issues[0]?.message ?? "Invalid building details");
  const data = parsed.data;

  const updated = await prisma.building.update({
    where: { id: buildingId },
    data: {
      name: data.name,
      description: data.description,
      location: data.location,
      county: data.county,
      town: data.town,
      exactAddress: data.exactAddress,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail || null,
      propertyType: data.propertyType,
      numberOfFloors: data.numberOfFloors,
      defaultDueDay: data.defaultDueDay ?? building.defaultDueDay,
    },
  });

  await logAudit({
    userId: actor.id,
    action: "BUILDING_UPDATED",
    entity: "Building",
    entityId: buildingId,
    metadata: { name: data.name },
  });

  return updated;
}

/** Landlord resubmits a rejected building for approval. */
export async function resubmitBuilding(actor: Actor, buildingId: string) {
  const building = await assertBuildingOwner(actor, buildingId);
  if (building.status !== "REJECTED") {
    throw toServiceError("Only rejected buildings can be resubmitted.");
  }
  const updated = await prisma.building.update({
    where: { id: buildingId },
    data: { status: "PENDING_APPROVAL", approvalNote: null },
  });
  await logAudit({
    userId: actor.id,
    action: "BUILDING_RESUBMITTED",
    entity: "Building",
    entityId: buildingId,
  });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      type: "BUILDING",
      title: "Building resubmitted",
      message: `${building.name} has been resubmitted for approval.`,
      link: "/admin/buildings",
    });
  }
  return updated;
}

export async function deleteBuilding(actor: Actor, buildingId: string) {
  const building = await assertBuildingOwner(actor, buildingId);
  const activeTenancies = await prisma.tenancy.count({
    where: { buildingId, status: "ACTIVE" },
  });
  if (activeTenancies > 0) {
    throw toServiceError("This building has active tenants. Move them out before deleting it.");
  }
  await prisma.building.delete({ where: { id: buildingId } });
  await logAudit({
    userId: actor.id,
    action: "BUILDING_DELETED",
    entity: "Building",
    entityId: buildingId,
    metadata: { name: building.name },
  });
  return { message: "Building deleted." };
}

export interface LandlordBuildingSummary {
  id: string;
  name: string;
  location: string;
  county: string;
  town: string;
  status: BuildingStatus;
  approvalNote: string | null;
  propertyType: string;
  createdAt: Date;
  floorsCount: number;
  unitsCount: number;
  vacantCount: number;
  occupiedCount: number;
  expectedMonthlyRent: number;
}

export async function listLandlordBuildings(actor: Actor): Promise<LandlordBuildingSummary[]> {
  const profile = await getLandlordProfile(actor);
  const buildings = await prisma.building.findMany({
    where: { landlordId: profile.id },
    include: {
      _count: { select: { floors: true, units: true } },
      units: { select: { availability: true, monthlyRent: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return buildings.map((b) => {
    const vacant = b.units.filter((u) => u.availability === "VACANT");
    const occupied = b.units.filter((u) => u.availability === "OCCUPIED");
    return {
      id: b.id,
      name: b.name,
      location: b.location,
      county: b.county,
      town: b.town,
      status: b.status,
      approvalNote: b.approvalNote,
      propertyType: b.propertyType,
      createdAt: b.createdAt,
      floorsCount: b._count.floors,
      unitsCount: b._count.units,
      vacantCount: vacant.length,
      occupiedCount: occupied.length,
      expectedMonthlyRent: b.units.reduce((sum, u) => sum + Number(u.monthlyRent), 0),
    };
  });
}

export async function getBuildingDetail(buildingId: string, includeImages = true) {
  return prisma.building.findUnique({
    where: { id: buildingId },
    include: {
      landlord: { include: { user: { select: { fullName: true, phone: true, email: true } } } },
      floors: {
        orderBy: { sortOrder: "asc" },
        include: {
          units: {
            orderBy: { unitNumber: "asc" },
            include: { images: true },
          },
        },
      },
      units: true,
      images: { orderBy: { sortOrder: "asc" } },
      ...(includeImages ? {} : {}),
    },
  });
}
