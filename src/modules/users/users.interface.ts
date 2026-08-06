import type { Role } from "@prisma/client";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface UpdateUserRoleInput {
  role: Role;
}

export interface UserStatsView {
  totalUsers: number;
  totalCustomers: number;
  totalAdmins: number;
  totalSuperAdmins: number;
  newUsersToday: number;
}



