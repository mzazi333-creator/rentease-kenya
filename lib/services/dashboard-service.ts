import { prisma } from "@/lib/db";
import { toServiceError, type Actor } from "@/lib/services/auth-service";
import { computeRentStatus, computeRentStatuses } from "@/lib/rent-status";
import { currentMonthYear } from "@/lib/utils";
import { listLandlordBuildings } from "@/lib/services/building-service";

/* ────────────────────────── Tenant dashboard ────────────────────────── */

export interface TenantDashboardData {
  tenancy: {
    id: string;
    startedAt: Date;
    building: { id: string; name: string; location: string; contactPhone: string; defaultDueDay: number };
    floorName: string;
    unitNumber: string;
    monthlyRent: string;
    unitImages: { url: string }[];
  } | null;
  rent: Awaited<ReturnType<typeof computeRentStatus>> | null;
  recentPayments: Array<{
    id: string;
    amount: string;
    transactionCode: string;
    status: string;
    month: number;
    year: number;
    createdAt: Date;
    rejectionReason: string | null;
  }>;
  applications: Array<{
    id: string;
    buildingName: string;
    unitNumber: string;
    status: string;
    createdAt: Date;
    note: string | null;
  }>;
  notificationsCount: number;
  settings: { mpesaPaybill: string; mpesaTill: string; mpesaAccount: string; paymentInstructions: string; defaultDueDay: number };
}

export async function getTenantDashboard(actor: Actor): Promise<TenantDashboardData> {
  const tenancy = await prisma.tenancy.findFirst({
    where: { tenantId: actor.id, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
    include: {
      building: true,
      floor: true,
      unit: { include: { images: true } },
    },
  });

  const [recentPayments, applications, notificationsCount, settings] = await Promise.all([
    prisma.payment.findMany({
      where: { tenantId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.tenantApplication.findMany({
      where: { tenantId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { building: { select: { name: true } }, unit: { select: { unitNumber: true } } },
    }),
    prisma.notification.count({ where: { userId: actor.id, read: false } }),
    (await import("@/lib/services/settings-service")).getSettings(),
  ]);

  const rent = tenancy ? await computeRentStatus(tenancy.id, tenancy.building.defaultDueDay) : null;

  return {
    tenancy: tenancy
      ? {
          id: tenancy.id,
          startedAt: tenancy.startedAt,
          building: {
            id: tenancy.building.id,
            name: tenancy.building.name,
            location: tenancy.building.location,
            contactPhone: tenancy.building.contactPhone,
            defaultDueDay: tenancy.building.defaultDueDay,
          },
          floorName: tenancy.floor.name,
          unitNumber: tenancy.unit.unitNumber,
          monthlyRent: tenancy.monthlyRent.toString(),
          unitImages: tenancy.unit.images,
        }
      : null,
    rent,
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: p.amount.toString(),
      transactionCode: p.transactionCode,
      status: p.status,
      month: p.month,
      year: p.year,
      createdAt: p.createdAt,
      rejectionReason: p.rejectionReason,
    })),
    applications: applications.map((a) => ({
      id: a.id,
      buildingName: a.building.name,
      unitNumber: a.unit.unitNumber,
      status: a.status,
      createdAt: a.createdAt,
      note: a.note,
    })),
    notificationsCount,
    settings: {
      mpesaPaybill: settings.mpesaPaybill,
      mpesaTill: settings.mpesaTill,
      mpesaAccount: settings.mpesaAccount,
      paymentInstructions: settings.paymentInstructions,
      defaultDueDay: settings.defaultDueDay,
    },
  };
}

/* ────────────────────────── Landlord dashboard ────────────────────────── */

export interface LandlordDashboardData {
  stats: {
    totalBuildings: number;
    totalFloors: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    monthlyExpectedRent: number;
    confirmedPayments: number;
    pendingPayments: number;
    overdueRent: number;
    pendingBuildings: number;
  };
  buildings: Awaited<ReturnType<typeof listLandlordBuildings>>;
  recentPayments: Array<{
    id: string;
    amount: string;
    status: string;
    transactionCode: string;
    month: number;
    year: number;
    createdAt: Date;
    tenantName: string;
    buildingName: string;
    unitNumber: string;
  }>;
  overdueTenancies: Array<{
    id: string;
    tenantName: string;
    phone: string;
    buildingName: string;
    unitNumber: string;
    monthlyRent: string;
    dueDay: number;
  }>;
  notificationsCount: number;
}

export async function getLandlordDashboard(actor: Actor): Promise<LandlordDashboardData> {
  const profile = await prisma.landlordProfile.findUnique({ where: { userId: actor.id } });
  if (!profile) throw toServiceError("Landlord profile not found.");

  const { month, year } = currentMonthYear();

  const [buildings, payments, notificationsCount] = await Promise.all([
    listLandlordBuildings(actor),
    prisma.payment.findMany({
      where: { landlordId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        tenant: { select: { fullName: true } },
        building: { select: { name: true } },
        unit: { select: { unitNumber: true } },
      },
    }),
    prisma.notification.count({ where: { userId: actor.id, read: false } }),
  ]);

  const units = (
    await prisma.unit.findMany({
      where: { building: { landlordId: profile.id } },
      select: { availability: true, monthlyRent: true },
    })
  ).map((u) => ({ availability: u.availability, rent: Number(u.monthlyRent) }));

  const stats = {
    totalBuildings: buildings.length,
    totalFloors: buildings.reduce((s, b) => s + b.floorsCount, 0),
    totalUnits: buildings.reduce((s, b) => s + b.unitsCount, 0),
    occupiedUnits: units.filter((u) => u.availability === "OCCUPIED").length,
    vacantUnits: units.filter((u) => u.availability === "VACANT").length,
    monthlyExpectedRent: buildings.reduce((s, b) => s + b.expectedMonthlyRent, 0),
    confirmedPayments: await prisma.payment.count({ where: { landlordId: profile.id, status: "CONFIRMED" } }),
    pendingPayments: await prisma.payment.count({
      where: { landlordId: profile.id, status: "PENDING_CONFIRMATION" },
    }),
    overdueRent: 0,
    pendingBuildings: buildings.filter((b) => b.status === "PENDING_APPROVAL").length,
  };

  // Overdue: active tenancies in landlord's buildings with no confirmed payment this month.
  const activeTenancies = await prisma.tenancy.findMany({
    where: { landlordId: profile.id, status: "ACTIVE" },
    include: {
      building: { select: { name: true, defaultDueDay: true } },
      unit: { select: { unitNumber: true, monthlyRent: true } },
      tenant: { select: { fullName: true, phone: true } },
    },
  });
  const statuses = await computeRentStatuses(activeTenancies);
  const overdueTenancies = activeTenancies
    .filter((t) => statuses.get(t.id)?.status === "OVERDUE")
    .map((t) => ({
      id: t.id,
      tenantName: t.tenant.fullName,
      phone: t.tenant.phone,
      buildingName: t.building.name,
      unitNumber: t.unit.unitNumber,
      monthlyRent: t.unit.monthlyRent.toString(),
      dueDay: t.building.defaultDueDay,
    }));
  stats.overdueRent = overdueTenancies.length;

  return {
    stats,
    buildings,
    recentPayments: payments.map((p) => ({
      id: p.id,
      amount: p.amount.toString(),
      status: p.status,
      transactionCode: p.transactionCode,
      month: p.month,
      year: p.year,
      createdAt: p.createdAt,
      tenantName: p.tenant.fullName,
      buildingName: p.building.name,
      unitNumber: p.unit.unitNumber,
    })),
    overdueTenancies,
    notificationsCount,
  };
}
