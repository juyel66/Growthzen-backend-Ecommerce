import { z } from "zod";

const parseNumber = (schema: z.ZodType<number>) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }

    return value;
  }, schema);

export const orderStatusUpdateValidationSchema = z.object({
  status: z.enum(["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]),
  adminNote: z.string().trim().nullable().optional(),
}).strict();

export const createOrderValidationSchema = z.object({
  products: z
    .array(
      z.object({
        productId: z.string().min(1, "Product id is required"),
        quantity: parseNumber(z.number().int().positive("Quantity must be greater than zero")),
        size: z.union([z.string().trim().min(1, "Size cannot be empty"), z.null()]).optional(),
      }).strict(),
    )
    .min(1, "At least one product is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Phone number is required"),
  deliveryArea: z.enum(["INSIDE_DHAKA", "OUTSIDE_DHAKA"]),
  address: z.string().min(1, "Address is required"),
  couponCode: z.union([z.string().trim().min(1, "Coupon code cannot be empty"), z.null()]).optional(),
}).strict();
