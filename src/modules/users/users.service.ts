import type { Role, User } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import type { UpdateUserRoleInput, UserListItem } from "./users.interface";

const listUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isVerified: true,
  isActive: true,
  createdAt: true,
} as const;

const roleHierarchy: Record<Role, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  RESELLER: 2,
  CUSTOMER: 1,
};

const canAdminChangeRole = (currentUserRole: Role, targetUserRole: Role, nextRole: Role): boolean => {
  if (currentUserRole === "SUPER_ADMIN") {
    return true;
  }

  if (currentUserRole !== "ADMIN") {
    return false;
  }

  if (targetUserRole === "SUPER_ADMIN" || targetUserRole === "ADMIN") {
    return false;
  }

  return nextRole === "CUSTOMER" || nextRole === "RESELLER";
};

export const getUsers = async (): Promise<UserListItem[]> => {
  return prismaClient.user.findMany({
    select: listUserSelect,
    orderBy: { createdAt: "desc" },
  });
};

export const getUserById = async (id: string): Promise<UserListItem> => {
  const user = await prismaClient.user.findUnique({
    where: { id },
    select: listUserSelect,
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};

export const updateUserRole = async (
  currentUserRole: Role,
  targetUserId: string,
  payload: UpdateUserRoleInput,
): Promise<UserListItem> => {
  const targetUser = await prismaClient.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVerified: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!targetUser) {
    throw new AppError(404, "User not found");
  }

  if (!canAdminChangeRole(currentUserRole, targetUser.role, payload.role)) {
    throw new AppError(403, "You do not have permission to change this role");
  }

  const updatedUser = await prismaClient.user.update({
    where: { id: targetUserId },
    data: { role: payload.role },
    select: listUserSelect,
  });

  return updatedUser;
};

export const deleteUser = async (currentUserId: string, currentUserRole: Role, targetUserId: string): Promise<void> => {
  if (currentUserId === targetUserId) {
    throw new AppError(403, "You cannot delete your own account");
  }

  const targetUser = await prismaClient.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!targetUser) {
    throw new AppError(404, "User not found");
  }

  if (currentUserRole === "ADMIN" && (targetUser.role === "ADMIN" || targetUser.role === "SUPER_ADMIN")) {
    throw new AppError(403, "You do not have permission to delete this user");
  }

  await prismaClient.user.delete({
    where: { id: targetUserId },
  });
};