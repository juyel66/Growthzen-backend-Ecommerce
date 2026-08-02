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

export const createBannerValidationSchema = z.object({
  title: z.string().max(200, "Title cannot exceed 200 characters").nullable().optional(),
  subtitle: z.string().max(500, "Subtitle cannot exceed 500 characters").nullable().optional(),
  image: z.string().min(1, "Image path or URL is required").max(2048),
  buttonText: z.string().max(100, "Button text cannot exceed 100 characters").nullable().optional(),
  buttonUrl: z.string().max(2048, "Button URL cannot exceed 2048 characters").nullable().optional(),
  displayOrder: parseNumber(z.number().int().min(0)).optional().default(0),
  isActive: parseOptionalBoolean.default(true),
});

export const updateBannerValidationSchema = z.object({
  title: z.string().max(200, "Title cannot exceed 200 characters").nullable().optional(),
  subtitle: z.string().max(500, "Subtitle cannot exceed 500 characters").nullable().optional(),
  image: z.string().min(1, "Image path or URL cannot be empty").max(2048).optional(),
  buttonText: z.string().max(100, "Button text cannot exceed 100 characters").nullable().optional(),
  buttonUrl: z.string().max(2048, "Button URL cannot exceed 2048 characters").nullable().optional(),
  displayOrder: parseNumber(z.number().int().min(0)).optional(),
  isActive: parseOptionalBoolean,
});

export const bannerQueryValidationSchema = z.object({
  page: parseNumber(z.number().int().min(1)).optional().default(1),
  limit: parseNumber(z.number().int().min(1).max(100)).optional().default(20),
  search: z.string().optional(),
  isActive: parseOptionalBoolean,
  sortBy: z.enum(["displayOrder", "createdAt", "title"]).optional().default("displayOrder"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});
