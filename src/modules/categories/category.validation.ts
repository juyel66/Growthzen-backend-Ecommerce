import { z } from "zod";

const parseOptionalNumber = (val: unknown, fallback: number): number => {
  if (val === undefined || val === null || val === "") return fallback;
  const num = typeof val === "number" ? val : Number(val);
  return Number.isFinite(num) ? num : fallback;
};

export const createCategoryValidationSchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(100, "Category name cannot exceed 100 characters"),
  slug: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  image: z.string().max(2048).nullable().optional(),
  parentCategoryId: z.string().nullable().optional(),
  discountPercentage: z.number().min(0, "Discount percentage cannot be less than 0").max(100, "Discount percentage cannot exceed 100").optional().default(0),
  discountEnabled: z.boolean().optional().default(false),
  sortOrder: z.number().int().min(0).optional().default(0),
  showOnHomepage: z.boolean().optional().default(false),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
  metaTitle: z.string().max(200).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
});

export const updateCategoryValidationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  image: z.string().max(2048).nullable().optional(),
  parentCategoryId: z.string().nullable().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  discountEnabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  showOnHomepage: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  metaTitle: z.string().max(200).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
});

export const categoryQueryValidationSchema = z.object({
  page: z.preprocess((val) => parseOptionalNumber(val, 1), z.number().int().min(1)).optional(),
  limit: z.preprocess((val) => parseOptionalNumber(val, 10), z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  sortBy: z.enum(["name", "createdAt", "sortOrder", "discountPercentage"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
