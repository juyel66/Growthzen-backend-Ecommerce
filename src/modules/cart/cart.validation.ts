import { z } from "zod";

const quantitySchema = z.number().int("Quantity must be an integer").positive("Quantity must be greater than zero");

export const addCartItemValidationSchema = z.object({
  productId: z.string().trim().min(1, "Product id is required"),
  quantity: quantitySchema,
}).strict();

export const updateCartItemValidationSchema = z.object({ quantity: quantitySchema }).strict();
