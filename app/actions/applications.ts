"use server";

import { getSessionUser } from "@/lib/auth";
import {
  submitApplication,
  cancelApplication,
} from "@/lib/services/application-service";
import {
  submitPayment,
  confirmPayment,
  rejectPayment,
} from "@/lib/services/payment-service";
import { assertRole } from "@/lib/guards";

export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T; redirectTo?: string }
  | { ok: false; message: string };

function err(e: unknown): ActionResult {
  const message = e instanceof Error ? e.message : "Something went wrong. Please try again.";
  return { ok: false, message };
}

export async function submitApplicationAction(input: {
  buildingId: string;
  floorId: string;
  unitId: string;
  note?: string;
}): Promise<ActionResult> {
  try {
    const user = await assertRole("TENANT");
    await submitApplication({ id: user.id, role: user.role }, input);
    return {
      ok: true,
      message: "Application submitted successfully and is awaiting admin approval.",
      redirectTo: "/dashboard/tenant",
    };
  } catch (e) {
    return err(e);
  }
}

export async function cancelApplicationAction(applicationId: string): Promise<ActionResult> {
  try {
    const user = await assertRole("TENANT");
    const result = await cancelApplication({ id: user.id, role: user.role }, applicationId);
    return { ok: true, message: result.message };
  } catch (e) {
    return err(e);
  }
}

/* ────────────────────────── Payments ────────────────────────── */

export async function submitPaymentAction(input: {
  transactionCode: string;
  amount: number;
  paymentDate: string;
}): Promise<ActionResult> {
  try {
    const user = await assertRole("TENANT");
    const payment = await submitPayment(
      { id: user.id, role: user.role },
      {
        transactionCode: input.transactionCode,
        amount: input.amount,
        paymentDate: new Date(input.paymentDate),
      }
    );
    return {
      ok: true,
      message: `Payment of KSh ${Number(payment.amount).toLocaleString()} submitted. Awaiting admin confirmation.`,
    };
  } catch (e) {
    return err(e);
  }
}

export async function confirmPaymentAction(paymentId: string): Promise<ActionResult> {
  try {
    const user = await assertRole("ADMIN");
    await confirmPayment({ id: user.id, role: user.role }, paymentId);
    return { ok: true, message: "Payment confirmed. The tenant's rent is now PAID." };
  } catch (e) {
    return err(e);
  }
}

export async function rejectPaymentAction(paymentId: string, reason: string): Promise<ActionResult> {
  try {
    const user = await assertRole("ADMIN");
    await rejectPayment({ id: user.id, role: user.role }, paymentId, reason);
    return { ok: true, message: "Payment rejected. The tenant has been notified." };
  } catch (e) {
    return err(e);
  }
}
