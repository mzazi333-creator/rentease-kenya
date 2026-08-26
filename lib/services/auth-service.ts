import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createHash, randomBytes } from "crypto";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "@/lib/validations/auth";
import { AuthError } from "@/lib/guards";
import type { Role, User } from "@prisma/client";

export interface Actor {
  id: string;
  role: Role;
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export class ServiceError extends Error {}

export function toServiceError(message: string): ServiceError {
  return new ServiceError(message);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function registerUser(input: unknown): Promise<{ user: User; resetLink?: never }> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw toServiceError(parsed.error.issues[0]?.message ?? "Invalid registration details");
  }
  const data = parsed.data;
  if (data.password !== data.confirmPassword) {
    throw toServiceError("Passwords do not match");
  }
  if (data.role !== "LANDLORD" && data.role !== "TENANT") {
    throw toServiceError("Only landlord and tenant accounts can be registered publicly.");
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw toServiceError("An account with this email already exists. Please log in.");
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        role: data.role,
      },
    });
    if (data.role === "LANDLORD") {
      await tx.landlordProfile.create({ data: { userId: created.id } });
    } else {
      await tx.tenantProfile.create({ data: { userId: created.id } });
    }
    return created;
  });

  await logAudit({
    userId: user.id,
    action: "USER_REGISTERED",
    entity: "User",
    entityId: user.id,
    metadata: { role: user.role },
  });

  await createNotification({
    userId: user.id,
    type: "SYSTEM",
    title: "Welcome to RentEase Kenya",
    message:
      user.role === "LANDLORD"
        ? "Welcome! Register your first building to start managing your property."
        : "Welcome! Search for available rentals and apply for your next home.",
    link: user.role === "LANDLORD" ? "/dashboard/landlord" : "/rentals",
  });

  return { user };
}

export async function loginUser(input: unknown): Promise<User> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    throw toServiceError(parsed.error.issues[0]?.message ?? "Invalid login details");
  }
  const data = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw toServiceError("Invalid email or password");
  const ok = await verifyPassword(data.password, user.passwordHash);
  if (!ok) throw toServiceError("Invalid email or password");
  if (user.status === "SUSPENDED") {
    throw toServiceError("This account has been suspended. Contact support.");
  }
  return user;
}

export async function requestPasswordReset(input: unknown): Promise<{ message: string; devResetUrl?: string }> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) throw toServiceError(parsed.error.issues[0]?.message ?? "Invalid email");
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    // Do not reveal whether the account exists
    return { message: "If an account exists for this email, a reset link has been prepared." };
  }
  const token = randomBytes(32).toString("hex");
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });
  await logAudit({ userId: user.id, action: "PASSWORD_RESET_REQUESTED", entity: "User", entityId: user.id });

  // Relative path — the UI resolves it against the current origin, so no
  // public app URL is required. Production deployments would send this via email.
  const resetPath = `/reset-password?token=${token}`;
  if (process.env.NODE_ENV !== "production") {
    return { message: "Password reset link generated.", devResetUrl: resetPath };
  }
  return { message: "If an account exists for this email, a reset link has been sent." };
}

export async function resetPassword(input: unknown): Promise<{ message: string }> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) throw toServiceError(parsed.error.issues[0]?.message ?? "Invalid reset details");
  const { token, password, confirmPassword } = parsed.data;
  if (password !== confirmPassword) throw toServiceError("Passwords do not match");

  const record = await prisma.passwordReset.findFirst({
    where: { tokenHash: hashToken(token), used: false },
    include: { user: true },
  });
  if (!record) throw toServiceError("This reset link is invalid or has already been used.");
  if (record.expiresAt < new Date()) throw toServiceError("This reset link has expired. Request a new one.");

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: record.id }, data: { used: true } }),
    // Revoke any existing sessions — the password has changed.
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  await logAudit({
    userId: record.userId,
    action: "PASSWORD_RESET",
    entity: "User",
    entityId: record.userId,
  });
  return { message: "Password reset successfully. You can now log in." };
}

export async function updateProfile(actor: Actor, input: unknown): Promise<User> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) throw toServiceError(parsed.error.issues[0]?.message ?? "Invalid profile details");
  const data = parsed.data;

  const user = await prisma.user.update({
    where: { id: actor.id },
    data: {
      fullName: data.fullName,
      phone: data.phone,
      nationalId: data.nationalId || null,
    },
  });

  if (actor.role === "TENANT") {
    await prisma.tenantProfile.upsert({
      where: { userId: actor.id },
      update: {
        emergencyName: data.emergencyName || null,
        emergencyContact: data.emergencyContact || null,
        occupation: data.occupation || null,
      },
      create: { userId: actor.id },
    });
  }

  await logAudit({ userId: actor.id, action: "PROFILE_UPDATED", entity: "User", entityId: actor.id });
  return user;
}

export async function changePassword(actor: Actor, input: unknown): Promise<{ message: string }> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) throw toServiceError(parsed.error.issues[0]?.message ?? "Invalid password details");
  const { currentPassword, newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) throw toServiceError("New passwords do not match");

  const user = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!user) throw new AuthError("Not authenticated");
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw toServiceError("Current password is incorrect");

  await prisma.$transaction([
    prisma.user.update({ where: { id: actor.id }, data: { passwordHash: await hashPassword(newPassword) } }),
    prisma.session.deleteMany({ where: { userId: actor.id } }),
  ]);
  await logAudit({ userId: actor.id, action: "PASSWORD_CHANGED", entity: "User", entityId: actor.id });
  return { message: "Password updated successfully. Please log in again." };
}

/** Fetch a user's complete profile incl. role-specific profile. */
export async function getUserWithProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { landlordProfile: true, tenantProfile: true },
  });
}
