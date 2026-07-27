import { z } from "zod";
const optionalPositiveInt = z.number().int().positive().optional().nullable();
const optionalMoney = z.number().finite().nonnegative().optional().nullable();
const fields = {
  code: z.string().trim().min(3).max(50).regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().trim().max(1000).optional().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().finite().positive(),
  scope: z.enum(["ENTIRE_ORDER", "SPECIFIC_PRODUCT", "SPECIFIC_CATEGORY"]),
  productIds: z.array(z.string().trim().min(1)).max(500).optional(),
  categories: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  maximumUsage: optionalPositiveInt,
  perUserUsageLimit: optionalPositiveInt,
  minimumOrderAmount: optionalMoney,
  maximumDiscount: optionalMoney,
  isActive: z.boolean().optional(),
};
const rules = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => schema.superRefine((data, ctx) => {
  const value = data as typeof data & { discountType?: string; discountValue?: number; scope?: string; productIds?: string[]; categories?: string[]; startsAt?: Date; expiresAt?: Date };
  if (value.discountType === "PERCENTAGE" && value.discountValue !== undefined && value.discountValue > 100) ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage discount cannot exceed 100" });
  if (value.startsAt && value.expiresAt && value.expiresAt <= value.startsAt) ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiry date must be after start date" });
  if (value.scope === "SPECIFIC_PRODUCT" && !value.productIds?.length) ctx.addIssue({ code: "custom", path: ["productIds"], message: "At least one product is required for product scope" });
  if (value.scope === "SPECIFIC_CATEGORY" && !value.categories?.length) ctx.addIssue({ code: "custom", path: ["categories"], message: "At least one category is required for category scope" });
});
export const createCouponValidationSchema = rules(z.object(fields).strict());
export const updateCouponValidationSchema = rules(z.object(fields).partial().strict()).refine((data) => Object.keys(data).length > 0, "At least one field is required");
export const applyCouponValidationSchema = z.object({ code: z.string().trim().min(1).max(50) }).strict();
export const removeCouponValidationSchema = z.object({}).strict();
