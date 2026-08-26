"use server";

import { getSessionUser } from "@/lib/auth";
import { assertRole } from "@/lib/guards";
import {
  setBuildingStatus,
  requestBuildingChanges,
  setUserStatus,
  moveTenantToUnit,
  listUsersAdmin,
} from "@/lib/services/admin-service";
import {
  approveApplication,
  rejectApplication,
  moveOutTenant,
} from "@/lib/services/application-service";
import { updateSettings } from "@/lib/services/settings-service";

export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T; redirectTo?: string }
  | { ok: false; message: string };

function err(e: unknown): ActionResult {
  const message = e instanceof Error ? e.message : "Something went wrong. Please try again.";
  return { ok: false, message };
}

/* ────────────────────────── Building approvals ────────────────────────── */

export async function approveBuildingAction(buildingId: string): Promise<ActionResult> {
  try {
    const user = await assertRole("ADMIN");
    await setBuildingStatus({ id: user.id, role: user.role }, buildingId, "APPROVED");
    return { ok: true, message: "Building approved and is now publicly visible." };
  } catch (e) {
    return err(e);
  }
}

export async function rejectBuildingAction(buildingId: string, note: string): Promise<ActionResult> {
  try {
    const user = await assertRole("ADMIN");
    await setBuildingStatus({ id: user.id, role: user.role }, buildingId, "REJECTED", note);
    return { ok: true, message: "Building rejected. The landlord has been notified." };
  } catch (e) {
    return err(e);
  }
}

export async function requestBuildingChangesAction(buildingId: string, note: string): Promise<ActionResult> {
  try {
    const user = await assertRole("ADMIN");
    await requestBuildingChanges({ id: user.id, role: user.role }, buildingId, note);
    return { ok: true, message: "Change request sent to the landlord." };
  } catch (e) {
    return err(e);
  }
}

export async function suspendBuildingAction(buildingId: string): Promise<ActionResult> {
  try {
    const user = await assertRole("ADMIN");
    await setBuildingStatus({ id: user.id, role: user.role }, buildingId, "SUSPENDED");
    return { ok: true, message: "Building suspended and removed from public listings." };
  } catch (e) {
    return err(e);
  }
}

/* ────────────────────────── Tenant applications ────────────────────────── */

export async function approveApplicationAction(applicationId: string): Promise<ActionResult> {
  try {
    const user = await assertRole("ADMIN");
    await approveApplication({ id: user.id, role: user.role }, applicationId);
    return {
      ok: true,
      message: "Tenant approved and assigned to the house. The unit is now OCCUPIED.",
    };
  } catch (e) {
    return err(e);
  }
}

export async function rejectApplicationAction(applicationId: string, reason: string): Promise<ActionResult> {
  try {
    const user = await assertRole("ADMIN");
    await rejectApplication({ id: user.id, role: user.role }, applicationId, reason);
    return { ok: true, message: "Application rejected. The tenant has been notified." };
  } catch (e) {
    return err(e);
  }
}

/* ────────────────────────── Tenancy management ────────────────────────── */

export async function moveOutTenantAction(tenancyId: string, reason: string): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    const result = await moveOutTenant({ id: user.id, role: user.role }, tenancyId, reason);
    return { ok: true, message: result.message };
  } catch (e) {
    return err(e);
  }
}

export async function moveTenantToUnitAction(tenancyId: string, newUnitId: string, reason?: string): Promise<ActionResult> {
  try {
    const user = await assertRole("ADMIN");
    await moveTenantToUnit({ id: user.id, role: user.role }, tenancyId, newUnitId, reason);
    return { ok: true, message: "Tenant moved to the new house. History preserved." };
  } catch (e) {
    return err(e);
  }
}

/* ────────────────────────── Users ────────────────────────── */

export async function setUserStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED"): Promise<ActionResult> {
  try {
    const user = await assertRole("ADMIN");
    await setUserStatus({ id: user.id, role: user.role }, userId, status);
    return { ok: true, message: status === "SUSPENDED" ? "User suspended." : "User reactivated." };
  } catch (e) {
    return err(e);
  }
}

/* ────────────────────────── Settings ────────────────────────── */

export async function updateSettingsAction(input: Record<string, unknown>): Promise<ActionResult> {
  try {
    const user = await assertRole("ADMIN");
    await updateSettings({ id: user.id, role: user.role }, input);
    return { ok: true, message: "Platform settings saved." };
  } catch (e) {
    return err(e);
  }
}

/* ────────────────────────── Notifications ────────────────────────── */

export async function markNotificationReadAction(notificationId: string): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    const { prisma } = await import("@/lib/db");
    await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id },
      data: { read: true },
    });
    return { ok: true, message: "Marked as read." };
  } catch (e) {
    return err(e);
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    const { prisma } = await import("@/lib/db");
    await prisma.notification.updateMany({ where: { userId: user.id }, data: { read: true } });
    return { ok: true, message: "All notifications marked as read." };
  } catch (e) {
    return err(e);
  }
}

export async function listUsersForAdminAction(): Promise<ActionResult> {
  try {
    await assertRole("ADMIN");
    const users = await listUsersAdmin();
    return { ok: true, message: "", data: users as never };
  } catch (e) {
    return err(e);
  }
}
