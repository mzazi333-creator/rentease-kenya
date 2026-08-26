import { z } from "zod";

export const PHONE_REGEX = /^(\+?254|0)[17]\d{8}$/;
export const MPESA_CODE_REGEX = /^[A-Za-z0-9]{6,15}$/;

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(150),
  phone: z.string().trim().regex(PHONE_REGEX, "Enter a valid Kenyan phone number, e.g. 0712 345 678"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[A-Za-z]/, "Password must contain letters")
    .regex(/[0-9]/, "Password must contain a number"),
  confirmPassword: z.string(),
  role: z.enum(["LANDLORD", "TENANT"]),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain letters")
    .regex(/[0-9]/, "Password must contain a number"),
  confirmPassword: z.string(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(PHONE_REGEX, "Enter a valid Kenyan phone number"),
  nationalId: z.string().trim().max(30).optional().or(z.literal("")),
  emergencyName: z.string().trim().max(100).optional().or(z.literal("")),
  emergencyContact: z.string().trim().max(20).optional().or(z.literal("")),
  occupation: z.string().trim().max(100).optional().or(z.literal("")),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain letters")
    .regex(/[0-9]/, "Password must contain a number"),
  confirmPassword: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
