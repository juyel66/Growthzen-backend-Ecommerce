import type { CookieOptions, Request, Response } from "express";
// eslint-disable-next-line import/no-cycle
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
  changePassword,
  forgotPassword,
  getMyProfile,
  login,
  logout,
  refreshToken,
  register,
  resetPassword,
  verifyOtp,
} from "./auth.service";

const getRefreshTokenCookieOptions = (): CookieOptions => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

export const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await register(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: "User registered successfully",
    data: result.user,
  });
});

export const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await login(req.body);

  if (result.refreshToken) {
    res.cookie("refreshToken", result.refreshToken, getRefreshTokenCookieOptions());
  }

  sendResponse(res, {
    message: "Login successful",
    data: result,
  });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(401, "User is not authenticated");
  }

  const user = await getMyProfile(userId);

  sendResponse(res, {
    message: "Profile retrieved successfully",
    data: user,
  });
});

export const logoutUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (userId) {
    await logout(userId);
  }

  res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

  sendResponse(res, {
    message: "Logout successful",
  });
});

export const forgotPasswordHandler = catchAsync(async (req: Request, res: Response) => {
  await forgotPassword(req.body);

  sendResponse(res, {
    message: "OTP sent to your email",
  });
});

export const verifyOtpHandler = catchAsync(async (req: Request, res: Response) => {
  await verifyOtp(req.body);

  sendResponse(res, {
    message: "OTP verified successfully",
  });
});

export const resetPasswordHandler = catchAsync(async (req: Request, res: Response) => {
  await resetPassword(req.body);

  sendResponse(res, {
    message: "Password reset successful",
  });
});

export const refreshTokenHandler = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    throw new AppError(401, "Refresh token is missing");
  }

  const result = await refreshToken(token);

  if (result.refreshToken) {
    res.cookie("refreshToken", result.refreshToken, getRefreshTokenCookieOptions());
  }

  sendResponse(res, {
    message: "Token refreshed successfully",
    data: result,
  });
});

export const changePasswordHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(401, "User is not authenticated");
  }

  await changePassword(userId, req.body);

  sendResponse(res, {
    message: "Password changed successfully",
  });
});