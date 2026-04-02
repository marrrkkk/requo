import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(8).max(128),
});

export const signupSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  email: z.email().trim(),
  password: z.string().min(8).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.email().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords must match.",
  path: ["confirmPassword"],
});
