import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { toServiceError, type Actor } from "@/lib/services/auth-service";
import { paymentSchema } from "@/lib/validations/tenant";
import { currentMonthYear } from "@/lib/utils";
import type { Payment, PaymentStatus } from "@prisma/client";

export interface SubmitPaymentInput {
  transactionCode: string;
  amount: number;
  paymentDate: Date;
}

/** Tenant submits an M-Pesa transaction code for their own active tenancy. */
export async function submitPayment(actor: Actor, input: unknown): Promise<Payment> {
  if (actor.role !== "TENANT") throw toServiceError("Only tenants can submit rent payments.");

  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) throw toServiceError(parsed.error.issues[0]?.message ?? "Invalid payment details");
  const data = parsed.data;

  const tenancy = await prisma.tenancy.findFirst({
    where: { tenantId: actor.id, status: "ACTIVE" },
    include: { unit: true, building: true },
  });
  if (!tenancy) {
    throw toServiceError("You do not have an active tenancy. No rent can be submitted.");
  }

  const month = data.paymentDate.getMonth() + 1;
  const year = data.paymentDate.getFullYear();

  // Business rule 8: M-Pesa transaction codes must be unique.
  const dup = await prisma.payment.findUnique({ where: { transactionCode: data.transactionCode } });
  if (dup) {
    throw toServiceError("This M-Pesa transaction code has already been used. Please check your code.");
  }

  // Prevent double-submission for the same month (pending or confirmed).
  const existing = await prisma.payment.findFirst({
    where: { tenancyId: tenancy.id, month, year, status: { in: ["PENDING_CONFIRMATION", "CONFIRMED"] } },
  });
  if (existing) {
    throw toServiceError(
      existing.status === "CONFIRMED"
        ? "Rent for this month has already been paid and confirmed."
        : "You already have a payment for this month awaiting confirmation."
    );
  }

  const payment = await prisma.payment.create({
    data: {
      tenancyId: tenancy.id,
      tenantId: actor.id,
      unitId: tenancy.unitId,
      buildingId: tenancy.buildingId,
      landlordId: tenancy.landlordId,
      amount: data.amount,
      transactionCode: data.transactionCode,
      paymentDate: data.paymentDate,
      month,
      year,
      method: "M-Pesa",
    },
  });

  await logAudit({
    userId: actor.id,
    action: "PAYMENT_SUBMITTED",
    entity: "Payment",
    entityId: payment.id,
    metadata: {
      amount: data.amount,
      transactionCode: data.transactionCode,
      month,
      year,
      tenancyId: tenancy.id,
      unitId: tenancy.unitId,
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      type: "PAYMENT",
      title: "New payment awaiting confirmation",
      message: `KSh ${data.amount} submitted for house ${tenancy.unit.unitNumber} at ${tenancy.building.name} (${data.transactionCode}).`,
      link: "/admin/payments",
    });
  }

  return payment;
}

async function getPaymentOrThrow(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      tenancy: { include: { tenant: { select: { fullName: true, email: true, phone: true } }, unit: true } },
      building: true,
    },
  });
  if (!payment) throw toServiceError("Payment not found.");
  return payment;
}

/** Admin confirms a payment. Only PENDING_CONFIRMATION payments can be confirmed. */
export async function confirmPayment(actor: Actor, paymentId: string): Promise<Payment> {
  if (actor.role !== "ADMIN") throw toServiceError("You do not have permission to perform this action.");
  const payment = await getPaymentOrThrow(paymentId);
  if (payment.status !== "PENDING_CONFIRMATION") {
    throw toServiceError("Only pending payments can be confirmed.");
  }

  // Guard: cannot confirm a second payment for an already-confirmed month.
  const alreadyConfirmed = await prisma.payment.findFirst({
    where: {
      tenancyId: payment.tenancyId,
      month: payment.month,
      year: payment.year,
      status: "CONFIRMED",
      id: { not: paymentId },
    },
  });
  if (alreadyConfirmed) {
    throw toServiceError(
      "This tenancy already has a confirmed payment for this month. Reject this duplicate instead."
    );
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "CONFIRMED", reviewedById: actor.id, reviewedAt: new Date() },
  });

  await logAudit({
    userId: actor.id,
    action: "PAYMENT_CONFIRMED",
    entity: "Payment",
    entityId: paymentId,
    metadata: {
      amount: payment.amount.toString(),
      transactionCode: payment.transactionCode,
      month: payment.month,
      year: payment.year,
    },
  });

  await createNotification({
    userId: payment.tenantId,
    type: "PAYMENT",
    title: "Your rent payment has been confirmed",
    message: `KSh ${Number(payment.amount).toLocaleString()} for ${new Date(payment.year, payment.month - 1, 1).toLocaleString("en-KE", { month: "long" })} ${payment.year} (${payment.transactionCode}) is confirmed.`,
    link: "/dashboard/tenant/payments",
  });

  const landlordUser = await prisma.user.findFirst({
    where: { landlordProfile: { id: payment.landlordId } },
  });
  if (landlordUser) {
    await createNotification({
      userId: landlordUser.id,
      type: "PAYMENT",
      title: "Rent payment confirmed",
      message: `KSh ${Number(payment.amount).toLocaleString()} received for house ${payment.tenancy.unit.unitNumber}.`,
      link: "/dashboard/landlord/payments",
    });
  }

  return updated;
}

/** Admin rejects a payment with a reason the tenant can see. */
export async function rejectPayment(actor: Actor, paymentId: string, reason: string): Promise<Payment> {
  if (actor.role !== "ADMIN") throw toServiceError("You do not have permission to perform this action.");
  const payment = await getPaymentOrThrow(paymentId);
  if (payment.status !== "PENDING_CONFIRMATION") {
    throw toServiceError("Only pending payments can be rejected.");
  }
  if (!reason.trim()) throw toServiceError("A rejection reason is required.");

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "REJECTED", rejectionReason: reason.trim(), reviewedById: actor.id, reviewedAt: new Date() },
  });

  await logAudit({
    userId: actor.id,
    action: "PAYMENT_REJECTED",
    entity: "Payment",
    entityId: paymentId,
    metadata: { transactionCode: payment.transactionCode, reason: reason.trim() },
  });

  await createNotification({
    userId: payment.tenantId,
    type: "PAYMENT",
    title: "Your payment was rejected",
    message: `KSh ${Number(payment.amount).toLocaleString()} (${payment.transactionCode}) was rejected. Reason: ${reason.trim()}`,
    link: "/dashboard/tenant/payments",
  });

  return updated;
}

/* ────────────────────────── Queries ────────────────────────── */

export async function listTenantPayments(actor: Actor) {
  return prisma.payment.findMany({
    where: { tenantId: actor.id },
    orderBy: { createdAt: "desc" },
    include: { building: { select: { name: true } }, unit: { select: { unitNumber: true } } },
  });
}

export async function listTenantPaymentHistory(actor: Actor) {
  const tenancy = await prisma.tenancy.findFirst({ where: { tenantId: actor.id, status: "ACTIVE" } });
  if (!tenancy) return [];
  return prisma.payment.findMany({
    where: { tenancyId: tenancy.id },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    include: { building: { select: { name: true } }, unit: { select: { unitNumber: true } } },
  });
}

export async function listLandlordPayments(actor: Actor) {
  const profile = await prisma.landlordProfile.findUnique({ where: { userId: actor.id } });
  if (!profile) throw toServiceError("Landlord profile not found.");
  return prisma.payment.findMany({
    where: { landlordId: profile.id },
    orderBy: { createdAt: "desc" },
    include: {
      tenant: { select: { fullName: true, phone: true } },
      unit: { select: { unitNumber: true } },
      building: { select: { id: true, name: true } },
    },
  });
}

export async function listAdminPayments(filters?: { status?: PaymentStatus; buildingId?: string }) {
  return prisma.payment.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.buildingId ? { buildingId: filters.buildingId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      tenant: { select: { fullName: true, phone: true, email: true } },
      unit: { select: { unitNumber: true } },
      building: { select: { id: true, name: true } },
    },
    take: 200,
  });
}

/** Overdue: active tenancies with no confirmed payment for the current month past the due day. */
export async function listOverdueTenancies() {
  const { month, year } = currentMonthYear();
  const tenancies = await prisma.tenancy.findMany({
    where: { status: "ACTIVE" },
    include: {
      building: { select: { id: true, name: true, defaultDueDay: true, landlordId: true } },
      unit: { select: { unitNumber: true, monthlyRent: true } },
      tenant: { select: { id: true, fullName: true, phone: true } },
    },
  });

  const paidTenancyIds = (
    await prisma.payment.findMany({
      where: { month, year, status: "CONFIRMED" },
      select: { tenancyId: true },
    })
  ).map((p) => p.tenancyId);
  const paidSet = new Set(paidTenancyIds);

  const now = new Date();
  return tenancies.filter((t) => {
    if (paidSet.has(t.id)) return false;
    const due = new Date(year, month - 1, Math.min(t.building.defaultDueDay, 28));
    return now > due;
  });
}

export async function paymentsForUnit(unitId: string) {
  return prisma.payment.findMany({
    where: { unitId },
    orderBy: { createdAt: "desc" },
  });
}
