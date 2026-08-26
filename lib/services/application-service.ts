import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { toServiceError, type Actor } from "@/lib/services/auth-service";
import { tenantApplicationSchema } from "@/lib/validations/tenant";

/** Tenant submits an application for a vacant unit in an approved building. */
export async function submitApplication(actor: Actor, input: unknown) {
  if (actor.role !== "TENANT") throw toServiceError("Only tenants can apply for houses.");

  const parsed = tenantApplicationSchema.safeParse(input);
  if (!parsed.success) throw toServiceError(parsed.error.issues[0]?.message ?? "Invalid application details");
  const { buildingId, floorId, unitId, note } = parsed.data;

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, buildingId, floorId },
    include: { building: true, floor: true },
  });
  if (!unit) throw toServiceError("This house was not found in the selected building.");
  if (unit.building.status !== "APPROVED") {
    throw toServiceError("This building is not yet approved for rentals.");
  }
  if (unit.availability !== "VACANT") {
    throw toServiceError("This house is no longer available.");
  }

  // Business rule 3: one unit cannot have multiple active/pending tenancies.
  const existingPending = await prisma.tenantApplication.findFirst({
    where: { unitId, status: "PENDING_APPROVAL" },
  });
  if (existingPending) {
    throw toServiceError("This house already has an application awaiting approval.");
  }
  const existingActive = await prisma.tenancy.findFirst({ where: { unitId, status: "ACTIVE" } });
  if (existingActive) {
    throw toServiceError("This house is no longer available.");
  }

  const myPending = await prisma.tenantApplication.findFirst({
    where: { tenantId: actor.id, unitId, status: "PENDING_APPROVAL" },
  });
  if (myPending) {
    throw toServiceError("You already have a pending application for this house.");
  }

  const profile = await prisma.tenantProfile.findUnique({ where: { userId: actor.id } });

  const application = await prisma.$transaction(async (tx) => {
    // Mark the unit as PENDING_APPROVAL so it is not listed as available meanwhile.
    await tx.unit.update({ where: { id: unitId }, data: { availability: "PENDING_APPROVAL" } });

    const app = await tx.tenantApplication.create({
      data: {
        tenantId: actor.id,
        tenantProfileId: profile?.id ?? null,
        buildingId,
        floorId,
        unitId,
        note: note || null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "TENANT_APPLICATION_SUBMITTED",
        entity: "TenantApplication",
        entityId: app.id,
        metadata: { buildingId, unitId, unitNumber: unit.unitNumber },
      },
    });
    return app;
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      type: "APPLICATION",
      title: "New tenant application",
      message: `A tenant has applied for house ${unit.unitNumber} at ${unit.building.name}.`,
      link: "/admin/tenants",
    });
  }

  return application;
}

export async function listMyApplications(actor: Actor) {
  return prisma.tenantApplication.findMany({
    where: { tenantId: actor.id },
    orderBy: { createdAt: "desc" },
    include: {
      building: { select: { id: true, name: true, location: true } },
      unit: { select: { id: true, unitNumber: true, monthlyRent: true } },
      floor: { select: { name: true } },
    },
  });
}

export async function cancelApplication(actor: Actor, applicationId: string) {
  const app = await prisma.tenantApplication.findFirst({
    where: { id: applicationId, tenantId: actor.id },
  });
  if (!app) throw toServiceError("Application not found.");
  if (app.status !== "PENDING_APPROVAL") {
    throw toServiceError("Only pending applications can be cancelled.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenantApplication.update({ where: { id: applicationId }, data: { status: "CANCELLED" } });
    // Only free the unit if no other pending application claims it.
    const other = await tx.tenantApplication.findFirst({
      where: { unitId: app.unitId, status: "PENDING_APPROVAL", id: { not: applicationId } },
    });
    const active = await tx.tenancy.findFirst({ where: { unitId: app.unitId, status: "ACTIVE" } });
    if (!other && !active) {
      await tx.unit.update({ where: { id: app.unitId }, data: { availability: "VACANT" } });
    }
  });

  await logAudit({
    userId: actor.id,
    action: "TENANT_APPLICATION_CANCELLED",
    entity: "TenantApplication",
    entityId: applicationId,
  });
  return { message: "Application cancelled." };
}

/* ────────────────────────── Admin side ────────────────────────── */

export async function listPendingApplications() {
  return prisma.tenantApplication.findMany({
    where: { status: "PENDING_APPROVAL" },
    orderBy: { createdAt: "asc" },
    include: {
      tenant: { select: { id: true, fullName: true, email: true, phone: true, nationalId: true } },
      building: { select: { id: true, name: true, location: true } },
      floor: { select: { name: true } },
      unit: { select: { id: true, unitNumber: true, monthlyRent: true } },
    },
  });
}

export async function listAllApplications(filters?: { status?: string }) {
  return prisma.tenantApplication.findMany({
    where: filters?.status ? { status: filters.status as never } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      tenant: { select: { id: true, fullName: true, email: true, phone: true } },
      building: { select: { id: true, name: true, location: true } },
      floor: { select: { name: true } },
      unit: { select: { id: true, unitNumber: true, monthlyRent: true } },
    },
    take: 200,
  });
}

/**
 * Approve a tenant application: creates the ACTIVE tenancy and marks the unit
 * OCCUPIED. Runs in a transaction — a unit can never end up with two active
 * tenancies.
 */
export async function approveApplication(actor: Actor, applicationId: string) {
  const app = await prisma.tenantApplication.findUnique({
    where: { id: applicationId },
    include: { unit: true, building: true },
  });
  if (!app) throw toServiceError("Application not found.");
  if (app.status !== "PENDING_APPROVAL") throw toServiceError("This application is no longer pending.");

  const active = await prisma.tenancy.findFirst({ where: { unitId: app.unitId, status: "ACTIVE" } });
  if (active) throw toServiceError("This house is already occupied by another tenant.");

  const tenancy = await prisma.$transaction(async (tx) => {
    const t = await tx.tenancy.create({
      data: {
        tenantId: app.tenantId,
        tenantProfileId: app.tenantProfileId,
        buildingId: app.buildingId,
        unitId: app.unitId,
        floorId: app.floorId,
        landlordId: app.building.landlordId,
        monthlyRent: app.unit.monthlyRent,
      },
    });
    await tx.tenantApplication.update({
      where: { id: applicationId },
      data: { status: "APPROVED", reviewedById: actor.id, reviewedAt: new Date() },
    });
    await tx.unit.update({ where: { id: app.unitId }, data: { availability: "OCCUPIED" } });
    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "TENANT_APPROVED",
        entity: "TenantApplication",
        entityId: applicationId,
        metadata: { tenancyId: t.id, unitId: app.unitId, unitNumber: app.unit.unitNumber },
      },
    });
    return t;
  });

  await createNotification({
    userId: app.tenantId,
    type: "APPLICATION",
    title: "Your rental application has been approved",
    message: `Welcome to ${app.building.name}, house ${app.unit.unitNumber}. Your tenancy starts now.`,
    link: "/dashboard/tenant",
  });
  const landlord = await prisma.user.findUnique({
    where: { id: (await prisma.landlordProfile.findUnique({ where: { id: app.building.landlordId } }))?.userId ?? "" },
  });
  if (landlord) {
    await createNotification({
      userId: landlord.id,
      type: "TENANCY",
      title: "New tenant assigned",
      message: `A tenant has been assigned to house ${app.unit.unitNumber} at ${app.building.name}.`,
      link: "/dashboard/landlord/tenants",
    });
  }

  return tenancy;
}

export async function rejectApplication(actor: Actor, applicationId: string, reason: string) {
  const app = await prisma.tenantApplication.findUnique({ where: { id: applicationId } });
  if (!app) throw toServiceError("Application not found.");
  if (app.status !== "PENDING_APPROVAL") throw toServiceError("This application is no longer pending.");
  if (!reason.trim()) throw toServiceError("A rejection reason is required.");

  await prisma.$transaction(async (tx) => {
    await tx.tenantApplication.update({
      where: { id: applicationId },
      data: { status: "REJECTED", note: reason.trim(), reviewedById: actor.id, reviewedAt: new Date() },
    });
    const other = await tx.tenantApplication.findFirst({
      where: { unitId: app.unitId, status: "PENDING_APPROVAL", id: { not: applicationId } },
    });
    const active = await tx.tenancy.findFirst({ where: { unitId: app.unitId, status: "ACTIVE" } });
    if (!other && !active) {
      await tx.unit.update({ where: { id: app.unitId }, data: { availability: "VACANT" } });
    }
    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "TENANT_REJECTED",
        entity: "TenantApplication",
        entityId: applicationId,
        metadata: { reason: reason.trim() },
      },
    });
  });

  await createNotification({
    userId: app.tenantId,
    type: "APPLICATION",
    title: "Your rental application was not approved",
    message: `Reason: ${reason.trim()}`,
    link: "/dashboard/tenant",
  });
  return { message: "Application rejected." };
}

/* ────────────────────────── Tenancy lifecycle ────────────────────────── */

export async function getActiveTenancy(tenantId: string) {
  return prisma.tenancy.findFirst({
    where: { tenantId, status: "ACTIVE" },
    include: {
      building: { include: { landlord: { include: { user: { select: { fullName: true, phone: true } } } } } },
      unit: { include: { images: true } },
      floor: true,
    },
    orderBy: { startedAt: "desc" },
  });
}

/** Move a tenant out (landlord or admin). Preserves history; frees the unit. */
export async function moveOutTenant(actor: Actor, tenancyId: string, reason: string) {
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: { unit: true, building: true },
  });
  if (!tenancy) throw toServiceError("Tenancy not found.");
  if (tenancy.status !== "ACTIVE") throw toServiceError("This tenancy is not active.");

  if (actor.role === "LANDLORD") {
    const profile = await prisma.landlordProfile.findUnique({ where: { userId: actor.id } });
    if (!profile || profile.id !== tenancy.landlordId) {
      throw toServiceError("You do not have permission to manage this tenancy.");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenancy.update({
      where: { id: tenancyId },
      data: { status: "MOVED_OUT", endedAt: new Date(), movedOutReason: reason || null, movedById: actor.id },
    });
    await tx.unit.update({ where: { id: tenancy.unitId }, data: { availability: "VACANT" } });
    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "TENANT_MOVED_OUT",
        entity: "Tenancy",
        entityId: tenancyId,
        metadata: { unitId: tenancy.unitId, unitNumber: tenancy.unit.unitNumber, reason },
      },
    });
  });

  await createNotification({
    userId: tenancy.tenantId,
    type: "TENANCY",
    title: "Your tenancy has ended",
    message: reason ? `Reason: ${reason}` : `You have been moved out of house ${tenancy.unit.unitNumber}.`,
    link: "/dashboard/tenant",
  });
  return { message: "Tenant moved out. The house is now vacant." };
}
