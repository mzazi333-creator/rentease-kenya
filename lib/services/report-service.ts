import { prisma } from "@/lib/db";
import { toServiceError, type Actor } from "@/lib/services/auth-service";
import { currentMonthYear } from "@/lib/utils";

export interface ReportFilters {
  from?: Date;
  to?: Date;
  buildingId?: string;
  landlordId?: string;
  status?: "CONFIRMED" | "PENDING_CONFIRMATION" | "REJECTED";
}

function assertAdmin(actor: Actor) {
  if (actor.role !== "ADMIN") throw toServiceError("You do not have permission to view reports.");
}

export async function rentCollectedReport(actor: Actor, filters: ReportFilters = {}) {
  assertAdmin(actor);
  const where: Record<string, unknown> = { status: filters.status ?? "CONFIRMED" };
  if (filters.from) where.paymentDate = { gte: filters.from };
  if (filters.to) where.paymentDate = { ...(where.paymentDate ?? {}), lte: filters.to };
  if (filters.buildingId) where.buildingId = filters.buildingId;
  if (filters.landlordId) where.landlordId = filters.landlordId;

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { paymentDate: "desc" },
    include: {
      building: { select: { id: true, name: true } },
      unit: { select: { unitNumber: true } },
      tenant: { select: { fullName: true } },
    },
    take: 1000,
  });

  const total = payments.reduce((s, p) => s + Number(p.amount), 0);
  return { payments, total, count: payments.length };
}

export async function pendingPaymentsReport(actor: Actor, filters: ReportFilters = {}) {
  assertAdmin(actor);
  const where: Record<string, unknown> = { status: "PENDING_CONFIRMATION" };
  if (filters.buildingId) where.buildingId = filters.buildingId;
  if (filters.landlordId) where.landlordId = filters.landlordId;
  return prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      building: { select: { name: true } },
      unit: { select: { unitNumber: true } },
      tenant: { select: { fullName: true } },
    },
    take: 500,
  });
}

export async function occupancyReport(actor: Actor, filters: ReportFilters = {}) {
  assertAdmin(actor);
  const buildingWhere: Record<string, unknown> = {};
  if (filters.buildingId) buildingWhere.id = filters.buildingId;

  const buildings = await prisma.building.findMany({
    where: buildingWhere,
    include: { units: { select: { availability: true } } },
    orderBy: { name: "asc" },
  });

  return buildings.map((b) => {
    const occupied = b.units.filter((u) => u.availability === "OCCUPIED").length;
    const vacant = b.units.filter((u) => u.availability === "VACANT").length;
    const maintenance = b.units.filter((u) => u.availability === "MAINTENANCE").length;
    const pending = b.units.filter((u) => u.availability === "PENDING_APPROVAL").length;
    return {
      building: b.name,
      buildingId: b.id,
      total: b.units.length,
      occupied,
      vacant,
      maintenance,
      pending,
      occupancyRate: b.units.length ? Math.round((occupied / b.units.length) * 100) : 0,
    };
  });
}

export async function landlordOverviewReport(actor: Actor) {
  assertAdmin(actor);
  const landlords = await prisma.landlordProfile.findMany({
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      _count: { select: { buildings: true } },
      buildings: {
        include: { units: { select: { availability: true, monthlyRent: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return landlords.map((l) => {
    const units = l.buildings.flatMap((b) => b.units);
    return {
      landlordId: l.id,
      name: l.user.fullName,
      email: l.user.email,
      phone: l.user.phone,
      buildings: l._count.buildings,
      units: units.length,
      occupied: units.filter((u) => u.availability === "OCCUPIED").length,
      expectedMonthly: units.reduce((s, u) => s + Number(u.monthlyRent), 0),
    };
  });
}

export async function tenantOverviewReport(actor: Actor) {
  assertAdmin(actor);
  const tenants = await prisma.user.findMany({
    where: { role: "TENANT" },
    include: {
      tenancies: {
        where: { status: "ACTIVE" },
        include: { building: { select: { name: true } }, unit: { select: { unitNumber: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  return tenants.map((t) => ({
    id: t.id,
    name: t.fullName,
    phone: t.phone,
    email: t.email,
    registered: t.createdAt,
    status: t.status,
    currentHouse: t.tenancies[0]
      ? `${t.tenancies[0].building.name} — ${t.tenancies[0].unit.unitNumber}`
      : null,
  }));
}

export async function summaryReport(actor: Actor) {
  assertAdmin(actor);
  const { month, year } = currentMonthYear();

  const [collectedThisMonth, pendingCount, overdueTenancies, buildings, users, units] = await Promise.all([
    prisma.payment.aggregate({
      where: { month, year, status: "CONFIRMED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.count({ where: { status: "PENDING_CONFIRMATION" } }),
    prisma.tenancy.findMany({
      where: { status: "ACTIVE" },
      include: {
        building: { select: { defaultDueDay: true } },
        unit: { select: { monthlyRent: true } },
      },
    }),
    prisma.building.count(),
    prisma.user.count(),
    prisma.unit.findMany({ select: { availability: true, monthlyRent: true } }),
  ]);

  const paid = await prisma.payment.findMany({
    where: { month, year, status: "CONFIRMED" },
    select: { tenancyId: true },
  });
  const paidSet = new Set(paid.map((p) => p.tenancyId));
  const now = new Date();
  const overdue = overdueTenancies.filter((t) => {
    if (paidSet.has(t.id)) return false;
    return now > new Date(year, month - 1, Math.min(t.building.defaultDueDay, 28));
  });

  return {
    month,
    year,
    collectedThisMonth: collectedThisMonth._sum.amount ?? 0,
    collectedCount: collectedThisMonth._count,
    pendingCount,
    overdueCount: overdue.length,
    overdueExpected: overdue.reduce((s, t) => s + Number(t.unit?.monthlyRent ?? 0), 0),
    buildings,
    users,
    unitsTotal: units.length,
    occupied: units.filter((u) => u.availability === "OCCUPIED").length,
    vacant: units.filter((u) => u.availability === "VACANT").length,
  };
}
