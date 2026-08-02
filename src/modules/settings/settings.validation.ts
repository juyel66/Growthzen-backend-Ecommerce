import { z } from "zod";

const parseNumber = (schema: z.ZodType<number>) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }
    return value;
  }, schema);

const parseOptionalBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return value;
}, z.boolean().optional());

export const updateSettingsValidationSchema = z.object({
  // General Settings
  storeName: z.string().min(2, "Store name must be at least 2 characters").max(100).optional(),
  companyName: z.string().min(2).max(100).optional(),
  storeLogo: z.string().max(2048).nullable().optional(),
  favicon: z.string().max(2048).nullable().optional(),
  supportEmail: z.string().email("Invalid support email address").optional(),
  supportPhone: z.string().min(5, "Support phone must be valid").max(30).optional(),
  companyAddress: z.string().min(5).max(500).optional(),
  currency: z.string().min(1).max(10).optional(),
  currencySymbol: z.string().min(1).max(10).optional(),
  timezone: z.string().min(1).max(50).optional(),
  language: z.string().min(2).max(10).optional(),

  // Delivery Settings
  insideDhakaDeliveryCharge: parseNumber(z.number().nonnegative("Inside Dhaka delivery charge must be >= 0")).optional(),
  outsideDhakaDeliveryCharge: parseNumber(z.number().nonnegative("Outside Dhaka delivery charge must be >= 0")).optional(),
  freeShippingMinOrderAmount: parseNumber(z.number().nonnegative("Free shipping min order amount must be >= 0")).optional(),
  estimatedDeliveryDays: parseNumber(z.number().int().min(1, "Estimated delivery days must be at least 1")).optional(),

  // Payment Settings
  codEnabled: parseOptionalBoolean,
  bkashEnabled: parseOptionalBoolean,
  nagadEnabled: parseOptionalBoolean,
  merchantName: z.string().max(100).nullable().optional(),
  merchantNumber: z.string().max(30).nullable().optional(),
  paymentInstructions: z.string().max(1000).nullable().optional(),

  // SMTP Settings
  smtpHost: z.string().max(200).nullable().optional(),
  smtpPort: parseNumber(z.number().int().min(1).max(65535)).nullable().optional(),
  smtpUsername: z.string().max(200).nullable().optional(),
  smtpPassword: z.string().max(200).nullable().optional(),
  senderName: z.string().max(100).nullable().optional(),
  senderEmail: z.union([z.string().email("Invalid sender email address"), z.string().length(0), z.null()]).optional(),

  // Maintenance Settings
  maintenanceMode: parseOptionalBoolean,
  maintenanceMessage: z.string().max(1000).nullable().optional(),

  // Legacy fields
  customerDiscountPercentage: parseNumber(z.number().int().min(0).max(100)).optional(),
  couponCode: z.string().nullable().optional(),
  couponActive: parseOptionalBoolean,
});