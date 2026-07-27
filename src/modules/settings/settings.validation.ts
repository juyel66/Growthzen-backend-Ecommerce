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

    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean().optional());

export const updateSettingsValidationSchema = z.object({
  insideDhakaDeliveryCharge: parseNumber(z.number().nonnegative("Inside Dhaka delivery charge must be greater than or equal to 0")).optional(),
  outsideDhakaDeliveryCharge: parseNumber(z.number().nonnegative("Outside Dhaka delivery charge must be greater than or equal to 0")).optional(),
  customerDiscountPercentage: parseNumber(z.number().int().min(0).max(100, "Customer discount percentage must be between 0 and 100")).optional(),
  couponCode: z.union([z.string().trim().min(1, "Coupon code cannot be empty"), z.null()]).optional(),
  couponActive: parseOptionalBoolean,
}).partial();