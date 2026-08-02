import { z } from "zod";

const parseOptionalNumber = (val: unknown, fallback: number): number => {
  if (val === undefined || val === null || val === "") return fallback;
  const num = typeof val === "number" ? val : Number(val);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

export const reportsQueryValidationSchema = z
  .object({
    range: z
      .enum([
        "TODAY",
        "YESTERDAY",
        "LAST_7_DAYS",
        "LAST_30_DAYS",
        "THIS_MONTH",
        "LAST_MONTH",
        "THIS_YEAR",
        "CUSTOM",
      ])
      .optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    page: z.preprocess((val) => parseOptionalNumber(val, 1), z.number().int().min(1)).optional(),
    limit: z
      .preprocess((val) => parseOptionalNumber(val, 10), z.number().int().min(1).max(100))
      .optional(),
    search: z.string().optional(),
    sortBy: z.enum(["revenue", "date", "orders", "products", "customers", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    format: z.enum(["csv", "xlsx", "pdf"]).optional(),
    status: z.string().optional(),
    paymentMethod: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.range === "CUSTOM") {
        return Boolean(data.from && data.to);
      }
      return true;
    },
    {
      message: "'from' and 'to' date parameters are required when range is CUSTOM",
      path: ["range"],
    }
  );

export type ReportsQuerySchemaType = z.infer<typeof reportsQueryValidationSchema>;
