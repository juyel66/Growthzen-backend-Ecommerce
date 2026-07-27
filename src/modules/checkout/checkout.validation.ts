import { z } from "zod";

export const deliveryAreaSchema = z.enum(["INSIDE_DHAKA", "OUTSIDE_DHAKA"]);

export const checkoutValidationSchema = z.object({
  customerName: z.string().trim().min(2).max(150),
  customerPhone: z.string().trim().min(7).max(30).regex(/^[+0-9][0-9\s-]+$/, "Invalid phone number"),
  address: z.string().trim().min(10).max(500),
  deliveryArea: deliveryAreaSchema,
  paymentMethod: z.enum(["COD", "BKASH", "NAGAD"]),
  shippingMethodId: z.string().trim().min(1).optional(),
  couponCode: z.string().trim().min(1).max(50).optional(),
}).strict();

export const checkoutSummaryQuerySchema = z.object({ deliveryArea: deliveryAreaSchema.default("INSIDE_DHAKA"), shippingMethodId: z.string().trim().min(1).optional() }).strict();

export const idempotencyKeySchema = z.string().trim().min(8, "Idempotency-Key must contain at least 8 characters").max(128);
