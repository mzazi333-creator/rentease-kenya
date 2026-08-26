import { getSessionUser } from "@/lib/auth";
import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Server-side guard for dashboard routes. Redirects unauthenticated users to login.
 */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Server-side role guard. Redirects users who lack the required role away from
 * other users' dashboards.
 */
export async function requireRole(...roles: Role[]) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

/**
 * Throws instead of redirecting — for server actions where we must return an error.
 */
export async function assertRole(...roles: Role[]): Promise<NonNullable<Awaited<ReturnType<typeof getSessionUser>>>> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("You must be logged in to perform this action.");
  if (!roles.includes(user.role)) throw new AuthError("You do not have permission to perform this action.");
  return user;
}
