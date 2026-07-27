import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { deleteUser, getUserById, getUsers, updateUserRole } from "./users.service";

const getParamId = (value: string | string[]): string => {
  return Array.isArray(value) ? value[0] : value;
};

export const listUsers = catchAsync(async (_req: Request, res: Response) => {
  const users = await getUsers();

  sendResponse(res, {
    message: "Users retrieved successfully",
    data: users,
  });
});

export const getUserDetails = catchAsync(async (req: Request, res: Response) => {
  const userId = getParamId(req.params.id);

  if (!userId) {
    throw new AppError(400, "User id is required");
  }

  const user = await getUserById(userId);

  sendResponse(res, {
    message: "User retrieved successfully",
    data: user,
  });
});

export const changeUserRole = catchAsync(async (req: Request, res: Response) => {
  const currentUserRole = req.user?.role;
  const userId = getParamId(req.params.id);

  if (!currentUserRole) {
    throw new AppError(401, "User is not authenticated");
  }

  if (!userId) {
    throw new AppError(400, "User id is required");
  }

  const user = await updateUserRole(currentUserRole, userId, req.body);

  sendResponse(res, {
    message: "User role updated successfully",
    data: user,
  });
});

export const removeUser = catchAsync(async (req: Request, res: Response) => {
  const currentUserRole = req.user?.role;
  const currentUserId = req.user?.id;
  const userId = getParamId(req.params.id);

  if (!currentUserRole || !currentUserId) {
    throw new AppError(401, "User is not authenticated");
  }

  if (!userId) {
    throw new AppError(400, "User id is required");
  }

  await deleteUser(currentUserId, currentUserRole, userId);

  sendResponse(res, {
    message: "User deleted successfully",
  });
});