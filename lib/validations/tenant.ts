import { z } from "zod";

export const tenantApplicationSchema = z.object({
  buildingId: z.string().min(1, "Please select a building"),
  floorId: z.string().min(1, "Please select a floor"),
  unitId: z.string().min(1, "Please select a house"),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const paymentSchema = z.object({
  transactionCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,15}$/, "Enter a valid M-Pesa transaction code, e.g. QKJ3WX2L"),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(10_000_000),
  paymentDate: z.coerce.date().refine((d) => d <= new Date(Date.now() + 24 * 60 * 60 * 1000), {
    message: "Payment date cannot be in the future",
  }),
});

export const adminRejectSchema = z.object({
  reason: z.string().trim().min(3, "A rejection reason is required").max(500),
});

export const adminBuildingActionSchema = z.object({
  buildingId: z.string().min(1),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});
