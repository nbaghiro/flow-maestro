import { z } from "zod";

export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).optional()
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string()
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address")
});

export const resetPasswordSchema = z.object({
    token: z.string().length(64, "Invalid token format"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100, "Password must be less than 100 characters")
});

export const verifyEmailSchema = z.object({
    token: z.string().length(64, "Invalid token format")
});

export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailSchema>;
