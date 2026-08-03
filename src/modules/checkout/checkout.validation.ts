import { z } from "zod";

export const deliveryAreaSchema = z.enum(["INSIDE_DHAKA", "OUTSIDE_DHAKA"], {
  message: "deliveryArea must be INSIDE_DHAKA or OUTSIDE_DHAKA",
});

export const checkoutValidationSchema = z.object({
  customerName: z.string({ message: "customerName is required" }).trim().min(2, "customerName must be at least 2 characters").max(150),
  customerPhone: z.string({ message: "customerPhone is required" }).trim().min(7, "customerPhone must be at least 7 characters").max(30).regex(/^[+0-9][0-9\s-]+$/, "customerPhone must be a valid phone number"),
  address: z.string({ message: "address is required" }).trim().min(10, "address must be at least 10 characters").max(500),
  deliveryArea: deliveryAreaSchema,
  paymentMethod: z.enum(["COD", "BKASH", "NAGAD"], {
    message: "paymentMethod must be COD, BKASH, or NAGAD",
  }),
  shippingMethodId: z.string().trim().min(1).optional(),
  couponCode: z.string().trim().min(1).max(50).optional(),
}).strict();

export const checkoutSummaryQuerySchema = z.object({ deliveryArea: deliveryAreaSchema.default("INSIDE_DHAKA"), shippingMethodId: z.string().trim().min(1).optional() }).strict();

export const idempotencyKeySchema = z.string().trim().min(8, "Idempotency-Key must contain at least 8 characters").max(128);
