import { z } from "zod";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters long");

export const registerValidationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
});

export const loginValidationSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const emailOnlyValidationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const verifyOtpValidationSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6 digit code"),
});

export const resetPasswordValidationSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6 digit code"),
  newPassword: passwordSchema,
});

export const changePasswordValidationSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export const refreshTokenValidationSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});
