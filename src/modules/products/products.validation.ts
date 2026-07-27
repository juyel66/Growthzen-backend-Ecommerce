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

const optionalNonnegativeNumber = (label: string, max?: number) => z.preprocess(
  (value) => {
    const normalized = emptyToUndefined(value);
    return typeof normalized === "string" ? Number(normalized) : normalized;
  },
  z.number().finite().nonnegative(`${label} cannot be negative`).max(max ?? Number.MAX_SAFE_INTEGER).optional().nullable(),
);

const optionalPositiveNumber = (label: string) => z.preprocess(
  (value) => {
    const normalized = emptyToUndefined(value);
    return typeof normalized === "string" ? Number(normalized) : normalized;
  },
  z.number().finite().positive(`${label} must be greater than 0`).optional().nullable(),
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

const mediaPath = (extensions: string[], label: string) => z.string().trim().min(1, `${label} is required`).max(2048)
  .refine((value) => {
    const cleanPath = value.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
    return extensions.some((extension) => cleanPath.endsWith(extension));
  }, `Unsupported ${label.toLowerCase()} format`);

const imagePath = mediaPath([".jpg", ".jpeg", ".png", ".webp"], "Image");
const videoPath = mediaPath([".mp4", ".mov", ".webm"], "Video");

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

const nullableText = (max: number) => z.preprocess(emptyToUndefined, z.string().trim().min(1).max(max).optional().nullable());

const productFields = {
  title: z.string().trim().min(2).max(200),
  shortDescription: z.string().trim().min(10).max(500),
  description: z.string().trim().min(10).max(20_000),
  category: z.string().trim().min(1).max(PRODUCT_CATEGORY_MAX_LENGTH),
  costPrice: positiveNumber("Cost price"),
  customerSellPrice: positiveNumber("Customer sell price"),
  resellerPrice: positiveNumber("Reseller price"),
  salePrice: optionalPositiveNumber("Sale price"),
  discountType: z.preprocess(emptyToUndefined, z.enum(["PERCENTAGE", "FIXED"]).optional().nullable()),
  discountValue: optionalNonnegativeNumber("Discount value"),
  taxRate: optionalNonnegativeNumber("Tax rate", 100),
  couponCode: nullableText(100),
  productCode: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/, "Product code contains invalid characters"),
  barcode: nullableText(100),
  attributes: attributesSchema.optional(),
  enableSize: booleanField.optional(),
  availableSizes: stringArray(PRODUCT_SIZES.length, "sizes")
    .pipe(z.array(z.enum(PRODUCT_SIZES)).refine((sizes) => new Set(sizes).size === sizes.length, "Sizes must be unique"))
    .optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  thumbnailImage: imagePath,
  productImages: stringArray(10, "gallery images").pipe(z.array(imagePath)).optional(),
  productVideos: stringArray(5, "product videos").pipe(z.array(videoPath)).optional(),
  isFeatured: booleanField.optional(),
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
  if ((discountType && typeof discountValue !== "number") || (!discountType && typeof discountValue === "number")) {
    context.addIssue({ code: "custom", path: ["discountValue"], message: "discountType and discountValue must be provided together" });
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
