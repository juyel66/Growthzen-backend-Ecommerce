import { z } from "zod";

export const addWishlistItemValidationSchema = z.object({
  productId: z.string().trim().min(1, "Product id is required"),
}).strict();
