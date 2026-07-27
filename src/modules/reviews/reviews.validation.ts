import { z } from "zod";

const parseRating = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }

  return value;
}, z.number().int().min(1).max(5));

export const createReviewSchema = z.object({
  orderItemId: z.string().min(1, "orderItemId is required"),
  rating: parseRating,
  comment: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export type CreateReviewSchema = typeof createReviewSchema;
