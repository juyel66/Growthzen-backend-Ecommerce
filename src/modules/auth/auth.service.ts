import type { User } from "@prisma/client";
import prismaClient from "../../config/prisma";
import { compareValue, hashValue } from "../../utils/password";
import AppError from "../../utils/AppError";
import { generateOtpCode, getOtpExpiryDate } from "../../utils/otp";
import sendEmail from "../../helpers/email";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { SUPER_ADMIN_EMAIL } from "../../constants/auth";
import type {
  AuthResult,
  ChangePasswordInput,
  EmailOnlyInput,
  JwtUserPayload,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SafeUser,
  VerifyOtpInput,
} from "./auth.interface";

const userSelect = {
  id: true,
  name: true,
  email: true,
  password: true,
  role: true,
  isVerified: true,
  isActive: true,
  refreshTokenHash: true,
  otpCodeHash: true,
  otpExpiresAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const sanitizeUser = (user: User): SafeUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const buildTokenPayload = (user: Pick<User, "id" | "name" | "email" | "role">): JwtUserPayload => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const createTokenPair = (user: User): AuthResult => {
  const payload = buildTokenPayload(user);

  return {
    user: sanitizeUser(user),
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};

const ensureUserIsActive = (user: User): void => {
  if (!user.isActive) {
    throw new AppError(403, "Your account is inactive");
  }
};

export const register = async (payload: RegisterInput): Promise<AuthResult> => {
  const existingUser = await prismaClient.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new AppError(409, "User already exists with this email");
  }

  const hashedPassword = await hashValue(payload.password);
  const assignedRole: User["role"] =
    payload.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? "SUPER_ADMIN" : "CUSTOMER";

  const createdUser = await prismaClient.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      role: assignedRole,
      isVerified: false,
    },
    select: userSelect,
  });

  return {
    user: sanitizeUser(createdUser as User),
  };
};

export const login = async (payload: LoginInput): Promise<AuthResult> => {
  const user = await prismaClient.user.findUnique({
    where: { email: payload.email },
    select: userSelect,
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  ensureUserIsActive(user as User);

  const isPasswordValid = await compareValue(payload.password, user.password);

  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password");
  }

  const tokenPair = createTokenPair(user as User);
  const refreshTokenHash = await hashValue(tokenPair.refreshToken ?? "");

  await prismaClient.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  });

  return {
    user: sanitizeUser(user as User),
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
  };
};

export const syncSuperAdminAccount = async (): Promise<void> => {
  await prismaClient.user.updateMany({
    where: {
      email: SUPER_ADMIN_EMAIL,
    },
    data: {
      role: "SUPER_ADMIN",
    },
  });
};

export const getMyProfile = async (userId: string): Promise<SafeUser> => {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVerified: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};

export const logout = async (userId: string): Promise<void> => {
  await prismaClient.user.update({
    where: { id: userId },
    data: { refreshTokenHash: null },
  });
};

export const forgotPassword = async (payload: EmailOnlyInput): Promise<void> => {
  const user = await prismaClient.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const otpCode = generateOtpCode();
  const otpCodeHash = await hashValue(otpCode);
  const otpExpiresAt = getOtpExpiryDate();

  await prismaClient.user.update({
    where: { id: user.id },
    data: {
      otpCodeHash,
      otpExpiresAt,
    },
  });

  await sendEmail({
    to: user.email,
    subject: "Your password reset code",
    text: `Your password reset code is ${otpCode}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
          <h2 style="margin: 0 0 16px; font-size: 24px;">Reset your password</h2>
          <p style="margin: 0 0 24px; line-height: 1.6;">Use the OTP below to verify your password reset request. The code expires in 10 minutes.</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 20px; background: #f1f5f9; border-radius: 12px; color: #111827;">${otpCode}</div>
          <p style="margin: 24px 0 0; font-size: 14px; color: #64748b;">If you did not request this reset, you can ignore this email.</p>
        </div>
      </div>
    `,
  });
};

const verifyOtpForUser = async (payload: VerifyOtpInput): Promise<User> => {
  const user = await prismaClient.user.findUnique({
    where: { email: payload.email },
    select: userSelect,
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (!user.otpCodeHash || !user.otpExpiresAt) {
    throw new AppError(400, "OTP has not been generated");
  }

  if (user.otpExpiresAt.getTime() < Date.now()) {
    throw new AppError(400, "OTP has expired");
  }

  const isOtpValid = await compareValue(payload.otp, user.otpCodeHash);

  if (!isOtpValid) {
    throw new AppError(400, "Invalid OTP");
  }

  return user as User;
};

export const verifyOtp = async (payload: VerifyOtpInput): Promise<void> => {
  await verifyOtpForUser(payload);
};

export const resetPassword = async (payload: ResetPasswordInput): Promise<void> => {
  const user = await verifyOtpForUser(payload);
  const hashedPassword = await hashValue(payload.newPassword);

  await prismaClient.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      refreshTokenHash: null,
      otpCodeHash: null,
      otpExpiresAt: null,
    },
  });
};

export const refreshToken = async (token: string): Promise<AuthResult> => {
  const payload = verifyRefreshToken(token);

  const user = await prismaClient.user.findUnique({
    where: { id: payload.id },
    select: userSelect,
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  ensureUserIsActive(user as User);

  if (!user.refreshTokenHash) {
    throw new AppError(401, "Refresh token is not valid");
  }

  const isRefreshTokenValid = await compareValue(token, user.refreshTokenHash);

  if (!isRefreshTokenValid) {
    throw new AppError(401, "Refresh token is not valid");
  }

  const tokenPair = createTokenPair(user as User);
  const refreshTokenHash = await hashValue(tokenPair.refreshToken ?? "");

  await prismaClient.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  });

  return {
    user: sanitizeUser(user as User),
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
  };
};

export const changePassword = async (userId: string, payload: ChangePasswordInput): Promise<void> => {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const isCurrentPasswordValid = await compareValue(payload.currentPassword, user.password);

  if (!isCurrentPasswordValid) {
    throw new AppError(401, "Current password is incorrect");
  }

  const hashedPassword = await hashValue(payload.newPassword);

  await prismaClient.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      refreshTokenHash: null,
    },
  });
};