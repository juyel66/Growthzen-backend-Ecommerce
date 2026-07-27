import type { Request, Response } from "express";
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

  if (!userId) {
    throw new AppError(401, "User is not authenticated");
  }

  await logout(userId);

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
  const result = await refreshToken(req.body.refreshToken);

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