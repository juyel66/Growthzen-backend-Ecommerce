import { z } from "zod";

const parseNumber = (schema: z.ZodType<number>) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }

    return value;
  }, schema);

export const orderStatusUpdateValidationSchema = z.object({
  orderStatus: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]).optional(),
  paymentStatus: z.enum(["PAID", "UNPAID", "PENDING", "FAILED", "CANCELLED", "REFUNDED"]).optional(),
  paymentCollected: z.boolean().optional(),
  adminNote: z.string().trim().nullable().optional(),
}).refine((data) => data.orderStatus !== undefined || data.status !== undefined || data.paymentStatus !== undefined || data.paymentCollected !== undefined || data.adminNote !== undefined, {
  message: "At least one field to update must be provided",
});

export const createOrderValidationSchema = z.object({
  products: z
    .array(
      z.object({
        productId: z.string().min(1, "Product id is required"),
        quantity: parseNumber(z.number().int().positive("Quantity must be greater than zero")),
        size: z.union([z.string().trim().min(1, "Size cannot be empty"), z.null()]).optional(),
      }).passthrough(),
    )
    .min(1, "At least one product is required"),
  customerName: z.string().trim().optional(),
  customerPhone: z.string().trim().optional(),
  customerEmail: z.union([z.string().trim().email("Invalid email address"), z.literal(""), z.null()]).optional(),
  userEmail: z.union([z.string().trim().email("Invalid email address"), z.literal(""), z.null()]).optional(),
  paymentMethod: z.union([z.enum(["COD", "BKASH", "NAGAD", "SSLCOMMERZ", "STRIPE", "PAYPAL"]), z.string().trim()]).optional().default("COD"),
  paymentCollected: z.boolean().optional(),
  guestName: z.string().trim().nullable().optional(),
  guestPhone: z.string().trim().nullable().optional(),
  guestEmail: z.union([z.string().trim().email("Invalid email address"), z.literal(""), z.null()]).optional(),
  guestAddress: z.string().trim().nullable().optional(),
  guestDivision: z.string().trim().nullable().optional(),
  guestDistrict: z.string().trim().nullable().optional(),
  guestUpazila: z.string().trim().nullable().optional(),
  division: z.string().trim().nullable().optional(),
  district: z.string().trim().nullable().optional(),
  upazila: z.string().trim().nullable().optional(),
  shippingType: z.string().trim().nullable().optional(),
  shippingMethodId: z.string().trim().nullable().optional(),
  orderNotes: z.string().trim().nullable().optional(),
  deliveryArea: z.enum(["INSIDE_DHAKA", "OUTSIDE_DHAKA"]),
  address: z.string().trim().optional(),
  couponCode: z.union([z.string().trim().min(1, "Coupon code cannot be empty"), z.null()]).optional(),
}).passthrough().refine((data) => {
  const phone = data.guestPhone || data.customerPhone;
  return Boolean(phone && phone.trim().length > 0);
}, {
  message: "Mobile phone number is required for order creation",
  path: ["guestPhone"],
});
