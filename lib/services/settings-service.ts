import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { toServiceError, type Actor } from "@/lib/services/auth-service";
import { z } from "zod";

const settingsSchema = z.object({
  platformName: z.string().trim().min(1).max(100),
  tagline: z.string().trim().max(200).optional().or(z.literal("")),
  supportPhone: z.string().trim().max(30),
  supportEmail: z.string().trim().email().max(150),
  contactAddress: z.string().trim().max(300).optional().or(z.literal("")),
  paymentInstructions: z.string().trim().min(5).max(1000),
  mpesaPaybill: z.string().trim().max(20),
  mpesaTill: z.string().trim().max(20),
  mpesaAccount: z.string().trim().max(30),
  defaultDueDay: z.coerce.number().int().min(1).max(28),
  currency: z.string().trim().min(3).max(5).default("KES"),
});

export async function getSettings() {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  if (settings) return settings;
  // First run — create defaults.
  return prisma.systemSettings.create({ data: { id: 1 } });
}

export async function updateSettings(actor: Actor, input: unknown) {
  if (actor.role !== "ADMIN") throw toServiceError("Only administrators can update settings.");
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) throw toServiceError(parsed.error.issues[0]?.message ?? "Invalid settings");
  const data = parsed.data;

  const updated = await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {
      platformName: data.platformName,
      tagline: data.tagline || undefined,
      supportPhone: data.supportPhone,
      supportEmail: data.supportEmail,
      contactAddress: data.contactAddress || null,
      paymentInstructions: data.paymentInstructions,
      mpesaPaybill: data.mpesaPaybill,
      mpesaTill: data.mpesaTill,
      mpesaAccount: data.mpesaAccount,
      defaultDueDay: data.defaultDueDay,
      currency: data.currency,
    },
    create: { id: 1, ...data },
  });

  await logAudit({
    userId: actor.id,
    action: "SETTINGS_UPDATED",
    entity: "SystemSettings",
    entityId: "1",
    metadata: { platformName: data.platformName },
  });
  return updated;
}

export async function getPaymentMethods() {
  return prisma.paymentMethod.findMany({ where: { isActive: true } });
}
