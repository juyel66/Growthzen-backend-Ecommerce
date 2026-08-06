import { z } from "zod";
import { PRODUCT_CATEGORY_MAX_LENGTH } from "./products.category";
import { PRODUCT_SIZES } from "./products.interface";

const emptyToUndefined = (value: unknown): unknown =>
  value === "" || value === null || value === undefined ? undefined : value;

const booleanField = z.preprocess((value) => {
  if (typeof value === "string") {
    if (["true", "1", "yes", "on"].includes(value.trim().toLowerCase())) return true;
    if (["false", "0", "no", "off"].includes(value.trim().toLowerCase())) return false;
  }
  return value;
}, z.boolean());

const positiveNumber = (label: string) => z.preprocess(
  (value) => typeof value === "string" && value.trim() ? Number(value) : value,
  z.number({ error: `${label} is required` }).finite().positive(`${label} must be greater than 0`),
);

const optionalNullableNumber = (label: string, max?: number) => z.preprocess(
  (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "" || trimmed === "null" || trimmed === "undefined") return null;
      const num = Number(trimmed);
      return Number.isNaN(num) ? value : num;
    }
    return value;
  },
  z.number({ message: `${label} must be a valid number` })
    .finite(`${label} must be finite`)
    .nonnegative(`${label} cannot be negative`)
    .max(max ?? Number.MAX_SAFE_INTEGER, `${label} cannot exceed ${max}`)
    .optional()
    .nullable(),
);

const optionalNullableText = (max: number) => z.preprocess(
  (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "" || trimmed === "null" || trimmed === "undefined") return null;
      return trimmed;
    }
    return value;
  },
  z.string().trim().min(1).max(max).optional().nullable(),
);

const optionalNullableEnum = <T extends [string, ...string[]]>(values: T) => z.preprocess(
  (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "" || trimmed === "null" || trimmed === "undefined") return null;
      return trimmed;
    }
    return value;
  },
  z.enum(values).optional().nullable(),
);

const stringArray = (max: number, label: string) => z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return [];
  try {
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Multipart clients may send comma-separated values.
  }
  return text.split(",").map((item) => item.trim()).filter(Boolean);
}, z.array(z.string().trim().min(1).max(500)).max(max, `Maximum ${max} ${label} allowed`));

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"];
const imagePath = z.string().trim().min(1, "Image URL is required").max(2048);
const videoPath = z.string().trim().min(1, "Video URL is required").max(2048);

export const productAttributeSchema = z.object({
  name: z.string().trim().min(1, "Attribute name is required").max(50),
  values: z.array(z.string().trim().min(1).max(100)).min(1, "At least one attribute value is required").max(100),
}).strict();

const attributesSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  if (!value.trim()) return [];
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}, z.array(productAttributeSchema).max(30, "Maximum 30 attributes allowed"))
  .superRefine((attributes, context) => {
    const names = new Set<string>();
    attributes.forEach((attribute, index) => {
      const key = attribute.name.toLowerCase();
      if (names.has(key)) {
        context.addIssue({ code: "custom", path: [index, "name"], message: "Attribute names must be unique" });
      }
      names.add(key);
    });
  });

const productFields = {
  title: z.string().trim().min(2).max(200),
  shortDescription: z.string().trim().min(10).max(500),
  description: z.string().trim().min(10).max(20_000),
  categoryId: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).max(PRODUCT_CATEGORY_MAX_LENGTH).optional(),
  costPrice: positiveNumber("Cost price"),
  customerSellPrice: positiveNumber("Customer sell price"),
  resellerPrice: positiveNumber("Reseller price"),
  salePrice: optionalNullableNumber("Sale price"),
  discountType: optionalNullableEnum(["PERCENTAGE", "FIXED"]),
  discountValue: optionalNullableNumber("Discount value"),
  taxRate: optionalNullableNumber("Tax rate", 100),
  couponCode: optionalNullableText(100),
  productCode: z.preprocess((value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "" || trimmed === "null" || trimmed === "undefined") return null;
      return trimmed;
    }
    return value;
  }, z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/, "Product code contains invalid characters").optional().nullable()),
  barcode: optionalNullableText(100),
  attributes: attributesSchema.optional(),
  enableSize: booleanField.optional(),
  availableSizes: stringArray(PRODUCT_SIZES.length, "sizes")
    .pipe(z.array(z.enum(PRODUCT_SIZES)).refine((sizes) => new Set(sizes).size === sizes.length, "Sizes must be unique"))
    .optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  thumbnailImage: imagePath,
  productImages: stringArray(10, "gallery images").pipe(z.array(imagePath)).optional(),
  productVideos: stringArray(5, "product videos").pipe(z.array(videoPath)).optional(),
  deletedProductImages: stringArray(10, "deleted gallery images").pipe(z.array(imagePath)).optional(),
  deleteThumbnail: booleanField.optional(),
  isFeatured: booleanField.optional(),
  specialSaleEnabled: booleanField.optional(),
  discountEnabled: booleanField.optional(),
};

const pricingRules = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => schema.superRefine((data, context) => {
  const pricing = data as typeof data & {
    discountType?: unknown;
    discountValue?: unknown;
    enableSize?: unknown;
    availableSizes?: unknown;
  };
  const discountType = pricing.discountType as string | null | undefined;
  const discountValue = pricing.discountValue as number | null | undefined;

  if (typeof discountValue === "number" && discountValue > 0 && !discountType) {
    context.addIssue({ code: "custom", path: ["discountType"], message: "discountType is required when discountValue is greater than 0" });
  }
  if (discountType === "PERCENTAGE" && typeof discountValue === "number" && discountValue > 100) {
    context.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage discount cannot exceed 100" });
  }
  if (pricing.enableSize === true && (!Array.isArray(pricing.availableSizes) || pricing.availableSizes.length === 0)) {
    context.addIssue({ code: "custom", path: ["availableSizes"], message: "Select at least one size when size is enabled" });
  }
  if (pricing.enableSize === undefined && Array.isArray(pricing.availableSizes)) {
    context.addIssue({ code: "custom", path: ["enableSize"], message: "enableSize is required when availableSizes is provided" });
  }
});

export const createProductValidationSchema = pricingRules(z.object(productFields).strict());
export const replaceProductValidationSchema = createProductValidationSchema;
export const updateProductValidationSchema = pricingRules(z.object(productFields).partial().strict())
  .refine((data) => Object.keys(data).length > 0, "At least one field is required");
