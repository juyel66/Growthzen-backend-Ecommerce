import { z } from "zod";

const dashboardRangeValues = ["TODAY", "YESTERDAY", "LAST_7_DAYS", "LAST_30_DAYS", "MONTHLY", "YEARLY", "CUSTOM"] as const;
const dashboardSortValues = ["createdAt", "totalAmount", "soldQuantity", "revenue"] as const;

export const dashboardQueryValidationSchema = z.object({
  range: z.enum(dashboardRangeValues).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(10).optional(),
  sortBy: z.enum(dashboardSortValues).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
}).strict().superRefine((data, ctx) => {
  if (data.range === "CUSTOM" && (!data.from || !data.to)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["range"],
      message: "Custom range requires both from and to dates",
    });
  }

  if (data.from && data.to && data.from > data.to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["to"],
      message: "To date must be greater than or equal to from date",
    });
  }
});

export type DashboardQueryInput = z.infer<typeof dashboardQueryValidationSchema>;