import { z } from "zod";

const fields = {
  name: z.string().trim().min(2).max(100),
  charge: z.number().finite().nonnegative("Shipping charge cannot be negative"),
  estimatedDeliveryDays: z.number().int().min(0).max(365),
  description: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
};
export const createShippingValidationSchema = z.object(fields).strict();
export const updateShippingValidationSchema = z.object(fields).partial().strict().refine((data) => Object.keys(data).length > 0, "At least one field is required");
