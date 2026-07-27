import { z } from "zod";

export const manualPaymentValidationSchema = z.object({
  orderId: z.string().trim().min(1, "Order id is required"),
  paymentMethod: z.enum(["BKASH", "NAGAD"]),
  senderNumber: z.string().trim().min(7).max(30).regex(/^[+0-9][0-9\s-]+$/, "Invalid sender number"),
  transactionId: z.string().trim().min(5).max(100).regex(/^[A-Za-z0-9_-]+$/, "Invalid transaction id"),
  paidAmount: z.number().finite().positive("Paid amount must be greater than zero"),
  paymentScreenshot: z.string().trim().min(1).max(2048).optional().nullable(),
}).strict();

export const rejectPaymentValidationSchema = z.object({
  reason: z.string().trim().min(3).max(500),
}).strict();

export const refundPaymentValidationSchema = z.object({
  reason: z.string().trim().min(3).max(500),
}).strict();

export const paymentListQueryValidationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  method: z.enum(["COD", "BKASH", "NAGAD"]).optional(),
  status: z.enum(["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"]).optional(),
}).strict();
