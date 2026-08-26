import type { BuildingStatus, PaymentStatus, Role, UnitAvailability } from "@prisma/client";

export function dashboardForRole(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "LANDLORD") return "/dashboard/landlord";
  return "/dashboard/tenant";
}

/** Format an amount as Kenyan Shillings: KSh 10,000 */
export function formatKSh(amount: number | string | { toString(): string }): string {
  const num = Number(amount);
  if (Number.isNaN(num)) return "KSh 0";
  return "KSh " + num.toLocaleString("en-KE", { maximumFractionDigits: 2 });
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString("en-KE", { month: "long" });
}

export function currentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/** Rent due date for a given month/year and due day, e.g. 5 September 2026 */
export function dueDateFor(month: number, year: number, dueDay: number): Date {
  return new Date(year, month - 1, Math.min(dueDay, 28));
}

/** Number of the month offset from now (0 = current). */
export function monthOffset(offset: number): { month: number; year: number } {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  LANDLORD: "Landlord",
  TENANT: "Tenant",
};

export const buildingStatusLabels: Record<BuildingStatus, string> = {
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

export const unitStatusLabels: Record<UnitAvailability, string> = {
  VACANT: "Vacant",
  OCCUPIED: "Occupied",
  PENDING_APPROVAL: "Pending Approval",
  MAINTENANCE: "Maintenance",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING_CONFIRMATION: "Pending Confirmation",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
};

export const propertyTypes = [
  "Apartment",
  "Bedsitter",
  "Single Room",
  "Studio",
  "Maisonette",
  "Townhouse",
  "Villa",
  "Commercial Shop",
  "Office Space",
  "Other",
] as const;

export const amenitiesList = [
  "Water",
  "Electricity",
  "Wi-Fi",
  "Parking",
  "Security",
  "Fenced Compound",
  "Borehole",
  "Balcony",
  "Furnished",
  "Kitchen",
  "Hot Water",
  "CCTV",
  "Gym",
  "Lift",
  "Solar",
] as const;

export const counties = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Kiambu",
  "Machakos",
  "Kajiado",
  "Uasin Gishu",
  "Meru",
  "Nyeri",
  "Kakamega",
  "Garissa",
  "Kilifi",
  "Kwale",
  "Bungoma",
  "Bomet",
  "Busia",
  "Embu",
  "Homa Bay",
  "Isiolo",
  "Kericho",
  "Kirinyaga",
  "Kitui",
  "Laikipia",
  "Lamu",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Migori",
  "Murang'a",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Vihiga",
  "Wajir",
  "West Pokot",
  "Elgeyo-Marakwet",
] as const;
