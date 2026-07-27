import { z } from "zod";

export const updateUserRoleValidationSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ADMIN", "RESELLER", "CUSTOMER"]),
});