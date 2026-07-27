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



