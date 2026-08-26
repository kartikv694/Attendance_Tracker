// Zod schemas for auth-related requests.
// Every API route validates its input against one of these before touching the DB -
// this is what the spec means by "Zod for API validation".

import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("enter a valid email"),
  password: z.string().min(1, "password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// only used for the one-time admin bootstrap - see /api/auth/register.
// teacher/student accounts are created by an admin through /api/admin/*, not here.
export const registerAdminSchema = z.object({
  name: z.string().min(1, "name is required"),
  email: z.string().email("enter a valid email"),
  password: z.string().min(6, "password must be at least 6 characters"),
});

export type RegisterAdminInput = z.infer<typeof registerAdminSchema>;

// step 1 of forgot-password: just the email, to send the code to
export const forgotPasswordSchema = z.object({
  email: z.string().email("enter a valid email"),
});

// step 2: the 6-digit code + the new password to set
export const resetPasswordSchema = z.object({
  email: z.string().email("enter a valid email"),
  code: z.string().regex(/^\d{6}$/, "enter the 6-digit code"),
  newPassword: z.string().min(6, "password must be at least 6 characters"),
});
