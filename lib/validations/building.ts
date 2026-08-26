import { z } from "zod";

export const buildingSchema = z.object({
  name: z.string().trim().min(2, "Building name is required").max(150),
  description: z.string().trim().min(10, "Please provide a description (at least 10 characters)").max(5000),
  location: z.string().trim().min(2, "Location is required").max(150),
  county: z.string().trim().min(2, "County is required").max(80),
  town: z.string().trim().min(2, "Town/area is required").max(120),
  exactAddress: z.string().trim().min(2, "Exact address is required").max(250),
  contactPhone: z
    .string()
    .trim()
    .regex(/^(\+?254|0)[17]\d{8}$/, "Enter a valid Kenyan phone number"),
  contactEmail: z.string().trim().toLowerCase().email("Enter a valid email").max(150).optional().or(z.literal("")),
  propertyType: z.string().trim().min(2, "Property type is required").max(80),
  numberOfFloors: z.coerce.number().int().min(1, "At least 1 floor required").max(100),
  defaultDueDay: z.coerce.number().int().min(1, "Due day must be 1-28").max(28).optional(),
});

export const floorSchema = z.object({
  buildingId: z.string().min(1),
  name: z.string().trim().min(1, "Floor name is required").max(80),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const renameFloorSchema = z.object({
  floorId: z.string().min(1),
  name: z.string().trim().min(1, "Floor name is required").max(80),
});

export const unitSchema = z.object({
  buildingId: z.string().min(1, "Building is required"),
  floorId: z.string().min(1, "Floor is required"),
  unitNumber: z.string().trim().min(1, "Unit number is required").max(40),
  monthlyRent: z.coerce.number().positive("Monthly rent must be greater than 0").max(10_000_000),
  depositAmount: z.coerce.number().min(0).max(10_000_000).optional().default(0),
  bedrooms: z.coerce.number().int().min(0).max(20).default(1),
  bathrooms: z.coerce.number().int().min(0).max(20).default(1),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  availability: z.enum(["VACANT", "OCCUPIED", "PENDING_APPROVAL", "MAINTENANCE"]).default("VACANT"),
  amenities: z.array(z.string()).default([]),
});

export const updateUnitSchema = unitSchema.partial().extend({
  unitId: z.string().min(1),
});

export type BuildingInput = z.infer<typeof buildingSchema>;
export type UnitInput = z.infer<typeof unitSchema>;
