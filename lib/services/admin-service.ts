import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { toServiceError, type Actor } from "@/lib/services/auth-service";
import { notifyLandlordOfBuilding } from "@/lib/notifications";
import { currentMonthYear } from "@/lib/utils";
import type { BuildingStatus } from "@prisma/client";

function assertAdmin(actor: Actor) {
  if (actor.role !== "ADMIN") throw toServiceError("You do not have permission to perform this action.");
}

/* ────────────────────────── Dashboard stats ────────────────────────── */

export async function adminDashboardStats() {
  const { month, year } = currentMonthYear();
  const [
    totalUsers,
    landlords,
    tenants,
    buildings,
    approvedBuildings,
    pendingBuildings,
    occupiedUnits,
    vacantUnits,
    paymentsThisMonth,
    pendingPayments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "LANDLORD" } }),
    prisma.user.count({ where: { role: "TENANT" } }),
    prisma.building.count(),
    prisma.building.count({ where: { status: "APPROVED" } }),
    prisma.building.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.unit.count({ where: { availability: "OCCUPIED" } }),
    prisma.unit.count({ where: { availability: "VACANT" } }),
    prisma.payment.count({ where: { month, year } }),
    prisma.payment.count({ where: { status: "PENDING_CONFIRMATION" } }),
  ]);

  const overdue = await prisma.tenancy.findMany({
    where: { status: "ACTIVE" },
    include: { building: { select: { defaultDueDay: true } } },
  });
  const confirmedPaid = await prisma.payment.findMany({
    where: { month, year, status: "CONFIRMED" },
    select: { tenancyId: true },
  });
  const paidSet = new Set(confirmedPaid.map((p) => p.tenancyId));
  const now = new Date();
  const overdueCount = overdue.filter((t) => {
    if (paidSet.has(t.id)) return false;
    return now > new Date(year, month - 1, Math.min(t.building.defaultDueDay, 28));
  }).length;

  return {
    totalUsers,
    landlords,
    tenants,
    buildings,
    approvedBuildings,
    pendingBuildings,
    occupiedUnits,
    vacantUnits,
    paymentsThisMonth,
    pendingPayments,
    overduePayments: overdueCount,
    pendingApplications: await prisma.tenantApplication.count({ where: { status: "PENDING_APPROVAL" } }),
    unreadNotifications: 0,
  };
}

/* ────────────────────────── Building approval ────────────────────────── */

export async function listBuildingsAdmin(filters?: { status?: BuildingStatus; q?: string }) {
  return prisma.building.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.q
        ? {
            OR: [
              { name: { contains: filters.q, mode: "insensitive" } },
              { location: { contains: filters.q, mode: "insensitive" } },
              { town: { contains: filters.q, mode: "insensitive" } },
              { county: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      landlord: { include: { user: { select: { fullName: true, email: true, phone: true } } } },
      _count: { select: { floors: true, units: true } },
    },
    take: 200,
  });
}

export async function getBuildingAdmin(buildingId: string) {
  return prisma.building.findUnique({
    where: { id: buildingId },
    include: {
      landlord: { include: { user: { select: { fullName: true, email: true, phone: true } } } },
      floors: { orderBy: { sortOrder: "asc" }, include: { units: { orderBy: { unitNumber: "asc" } } } },
      images: true,
    },
  });
}

export async function setBuildingStatus(
  actor: Actor,
  buildingId: string,
  status: "APPROVED" | "REJECTED" | "SUSPENDED",
  note?: string
) {
  assertAdmin(actor);
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    include: { landlord: { include: { user: true } } },
  });
  if (!building) throw toServiceError("Building not found.");
  if (status === "REJECTED" && !note?.trim()) {
    throw toServiceError("A rejection reason is required.");
  }

  const updated = await prisma.building.update({
    where: { id: buildingId },
    data: {
      status,
      approvalNote: note?.trim() || null,
      reviewedById: actor.id,
      reviewedAt: new Date(),
    },
  });

  await logAudit({
    userId: actor.id,
    action: `BUILDING_${status}`,
    entity: "Building",
    entityId: buildingId,
    metadata: { name: building.name, note: note?.trim() ?? null },
  });

  const actionText =
    status === "APPROVED"
      ? "approved"
      : status === "REJECTED"
        ? "rejected"
        : "suspended";

  await notifyLandlordOfBuilding(
    building.landlord.userId,
    buildingId,
    `Your building has been ${actionText}`,
    status === "APPROVED"
      ? `Great news — ${building.name} is now live and visible to tenants searching for rentals.`
      : status === "REJECTED"
        ? `${building.name} was rejected. Reason: ${note?.trim() ?? "No reason provided"}. You can edit and resubmit it.`
        : `${building.name} has been suspended by the administrator.`
  );

  return updated;
}

/** "Request changes" = reject with a change-request note; landlord resubmits after editing. */
export async function requestBuildingChanges(actor: Actor, buildingId: string, note: string) {
  assertAdmin(actor);
  if (!note?.trim()) throw toServiceError("Please describe the changes required.");
  return setBuildingStatus(actor, buildingId, "REJECTED", `CHANGES REQUESTED: ${note.trim()}`);
}

/* ────────────────────────── User management ────────────────────────── */

export async function listUsersAdmin(filters?: { role?: string; q?: string }) {
  return prisma.user.findMany({
    where: {
      ...(filters?.role ? { role: filters.role as never } : {}),
      ...(filters?.q
        ? {
            OR: [
              { fullName: { contains: filters.q, mode: "insensitive" } },
              { email: { contains: filters.q, mode: "insensitive" } },
              { phone: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      landlordProfile: { include: { _count: { select: { buildings: true } } } },
      tenantProfile: true,
    },
    take: 200,
  });
}

export async function setUserStatus(actor: Actor, userId: string, status: "ACTIVE" | "SUSPENDED") {
  assertAdmin(actor);
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw toServiceError("User not found.");
  if (target.role === "ADMIN" && status === "SUSPENDED") {
    throw toServiceError("Administrator accounts cannot be suspended.");
  }

  const updated = await prisma.user.update({ where: { id: userId }, data: { status } });
  await logAudit({
    userId: actor.id,
    action: `USER_${status}`,
    entity: "User",
    entityId: userId,
    metadata: { role: target.role },
  });
  await createNotification({
    userId,
    type: "SYSTEM",
    title: status === "SUSPENDED" ? "Account suspended" : "Account reactivated",
    message:
      status === "SUSPENDED"
        ? "Your account has been suspended. Contact support for more information."
        : "Your account has been reactivated.",
  });
  return updated;
}

export async function listTenantsAdmin(filters?: { q?: string }) {
  return prisma.user.findMany({
    where: {
      role: "TENANT",
      ...(filters?.q
        ? {
            OR: [
              { fullName: { contains: filters.q, mode: "insensitive" } },
              { email: { contains: filters.q, mode: "insensitive" } },
              { phone: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      tenantProfile: true,
      tenancies: {
        where: { status: "ACTIVE" },
        include: { building: { select: { id: true, name: true } }, unit: { select: { unitNumber: true } } },
      },
    },
    take: 200,
  });
}

export async function listLandlordsAdmin() {
  return prisma.user.findMany({
    where: { role: "LANDLORD" },
    orderBy: { createdAt: "desc" },
    include: {
      landlordProfile: { include: { _count: { select: { buildings: true } } } },
    },
    take: 200,
  });
}

/* ────────────────────────── Tenant move (admin) ────────────────────────── */

/**
 * Move a tenant to a different unit. Ends the old tenancy (preserving history)
 * and creates a new ACTIVE tenancy on the target unit. Target must be VACANT.
 */
export async function moveTenantToUnit(actor: Actor, tenancyId: string, newUnitId: string, reason?: string) {
  assertAdmin(actor);
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: { unit: true, building: true },
  });
  if (!tenancy) throw toServiceError("Tenancy not found.");
  if (tenancy.status !== "ACTIVE") throw toServiceError("This tenancy is not active.");

  const newUnit = await prisma.unit.findUnique({ where: { id: newUnitId } });
  if (!newUnit || newUnit.buildingId !== tenancy.buildingId) {
    throw toServiceError("Target unit not found in the same building.");
  }
  if (newUnit.availability !== "VACANT") {
    throw toServiceError("The target house is not vacant.");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.tenancy.update({
      where: { id: tenancyId },
      data: {
        status: "MOVED_OUT",
        endedAt: new Date(),
        movedOutReason: reason?.trim() || `Moved to ${newUnit.unitNumber}`,
        movedById: actor.id,
      },
    });
    await tx.unit.update({ where: { id: tenancy.unitId }, data: { availability: "VACANT" } });

    const newTenancy = await tx.tenancy.create({
      data: {
        tenantId: tenancy.tenantId,
        tenantProfileId: tenancy.tenantProfileId,
        buildingId: tenancy.buildingId,
        unitId: newUnit.id,
        floorId: newUnit.floorId,
        landlordId: tenancy.landlordId,
        monthlyRent: newUnit.monthlyRent,
      },
    });
    await tx.unit.update({ where: { id: newUnit.id }, data: { availability: "OCCUPIED" } });
    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "TENANT_MOVED_UNIT",
        entity: "Tenancy",
        entityId: tenancyId,
        metadata: {
          fromUnit: tenancy.unit.unitNumber,
          toUnit: newUnit.unitNumber,
          newTenancyId: newTenancy.id,
        },
      },
    });
    return newTenancy;
  });

  await createNotification({
    userId: tenancy.tenantId,
    type: "TENANCY",
    title: "You have been moved to a new house",
    message: `You were moved from house ${tenancy.unit.unitNumber} to house ${newUnit.unitNumber} at ${tenancy.building.name}.`,
    link: "/dashboard/tenant",
  });
  return result;
}

/* ────────────────────────── Misc lists ────────────────────────── */

export async function getAuditLogs(filters?: { action?: string }) {
  return prisma.auditLog.findMany({
    where: filters?.action ? { action: filters.action } : undefined,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { fullName: true, email: true, role: true } } },
    take: 200,
  });
}

export async function getTenantPaymentHistoryAdmin(tenantId: string) {
  return prisma.payment.findMany({
    where: { tenantId },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    include: { building: { select: { name: true } }, unit: { select: { unitNumber: true } } },
  });
}
