"use server";

import { signSessionToken, setSessionCookie, clearSessionCookie, getSessionUser } from "@/lib/auth";
import {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  changePassword,
} from "@/lib/services/auth-service";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { dashboardForRole } from "@/lib/utils";

export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T; redirectTo?: string }
  | { ok: false; message: string };

function err(e: unknown): ActionResult {
  const message = e instanceof Error ? e.message : "Something went wrong. Please try again.";
  return { ok: false, message };
}

export async function registerAction(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: "LANDLORD" | "TENANT";
}): Promise<ActionResult> {
  const rl = rateLimit(await rateLimitKey("register"), 5);
  if (!rl.allowed) return { ok: false, message: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.` };
  try {
    const { user } = await registerUser(input);
    const token = await signSessionToken({ sub: user.id, role: user.role, name: user.fullName });
    await setSessionCookie(token);
    return { ok: true, message: "Account created successfully.", redirectTo: dashboardForRole(user.role) };
  } catch (e) {
    return err(e);
  }
}

export async function loginAction(input: { email: string; password: string }): Promise<ActionResult> {
  const rl = rateLimit(await rateLimitKey("login"), 10);
  if (!rl.allowed) return { ok: false, message: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.` };
  try {
    const user = await loginUser(input);
    const token = await signSessionToken({ sub: user.id, role: user.role, name: user.fullName });
    await setSessionCookie(token);
    return { ok: true, message: `Welcome back, ${user.fullName.split(" ")[0]}!`, redirectTo: dashboardForRole(user.role) };
  } catch (e) {
    return err(e);
  }
}

export async function logoutAction(): Promise<ActionResult> {
  await clearSessionCookie();
  redirect("/");
}

export async function forgotPasswordAction(input: { email: string }): Promise<
  ActionResult<{ devResetUrl?: string }>
> {
  const rl = rateLimit(await rateLimitKey("forgot-password"), 5);
  if (!rl.allowed) return { ok: false, message: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.` };
  try {
    const result = await requestPasswordReset(input);
    return { ok: true, message: result.message, data: { devResetUrl: result.devResetUrl } };
  } catch (e) {
    return err(e);
  }
}

export async function resetPasswordAction(input: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  try {
    const result = await resetPassword(input);
    return { ok: true, message: result.message, redirectTo: "/login" };
  } catch (e) {
    return err(e);
  }
}

export async function updateProfileAction(input: {
  fullName: string;
  phone: string;
  nationalId?: string;
  emergencyName?: string;
  emergencyContact?: string;
  occupation?: string;
}): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    await updateProfile({ id: user.id, role: user.role }, input);
    return { ok: true, message: "Profile updated successfully." };
  } catch (e) {
    return err(e);
  }
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    await changePassword({ id: user.id, role: user.role }, input);
    return { ok: true, message: "Password changed successfully." };
  } catch (e) {
    return err(e);
  }
}
