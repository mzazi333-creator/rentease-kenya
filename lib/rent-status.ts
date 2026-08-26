import { prisma } from "@/lib/db";
import { dueDateFor, currentMonthYear } from "@/lib/utils";

/** Computed rent status — not stored in the DB, hence not a Prisma enum usage. */
export type RentStatus = "PAID" | "PENDING" | "OVERDUE";

export interface RentStatusResult {
  status: RentStatus;
  dueDate: Date;
  month: number;
  year: number;
  confirmedPayment?: { id: string; amount: string; transactionCode: string; paymentDate: Date } | null;
}

/**
 * Determines the rent status of an active tenancy for the current month.
 * PAID only when a CONFIRMED payment exists for this month/year.
 * OVERDUE when today is past the due day and no confirmed payment exists.
 * Otherwise PENDING.
 */
export async function computeRentStatus(
  tenancyId: string,
  dueDay: number,
  month: number = currentMonthYear().month,
  year: number = currentMonthYear().year
): Promise<RentStatusResult> {
  const dueDate = dueDateFor(month, year, dueDay);
  const confirmed = await prisma.payment.findFirst({
    where: { tenancyId, month, year, status: "CONFIRMED" },
  });

  if (confirmed) {
    return {
      status: "PAID",
      dueDate,
      month,
      year,
      confirmedPayment: {
        id: confirmed.id,
        amount: confirmed.amount.toString(),
        transactionCode: confirmed.transactionCode,
        paymentDate: confirmed.paymentDate,
      },
    };
  }

  const now = new Date();
  const isOverdue = now > dueDate;
  return { status: isOverdue ? "OVERDUE" : "PENDING", dueDate, month, year };
}

/** Batch version — for dashboard lists, avoids N+1 by fetching payments once. */
export async function computeRentStatuses(
  tenancies: Array<{ id: string; building: { defaultDueDay: number } }>,
  month: number = currentMonthYear().month,
  year: number = currentMonthYear().year
): Promise<Map<string, RentStatusResult>> {
  const confirmed = await prisma.payment.findMany({
    where: {
      tenancyId: { in: tenancies.map((t) => t.id) },
      month,
      year,
      status: "CONFIRMED",
    },
  });
  const byTenancy = new Map(confirmed.map((p) => [p.tenancyId, p]));
  const now = new Date();
  const result = new Map<string, RentStatusResult>();

  for (const t of tenancies) {
    const dueDate = dueDateFor(month, year, t.building.defaultDueDay);
    const p = byTenancy.get(t.id);
    if (p) {
      result.set(t.id, {
        status: "PAID",
        dueDate,
        month,
        year,
        confirmedPayment: {
          id: p.id,
          amount: p.amount.toString(),
          transactionCode: p.transactionCode,
          paymentDate: p.paymentDate,
        },
      });
    } else {
      result.set(t.id, {
        status: now > dueDate ? "OVERDUE" : "PENDING",
        dueDate,
        month,
        year,
      });
    }
  }
  return result;
}
