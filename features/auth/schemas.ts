import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().max(320).email(),
  password: z.string().min(8).max(128),
});

export const signupSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  email: z.string().trim().max(320).email(),
  password: z.string().min(8).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().max(320).email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(512),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords must match.",
  path: ["confirmPassword"],
});
