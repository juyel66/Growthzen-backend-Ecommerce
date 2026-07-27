import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { checkout, getCheckoutSummary } from "./checkout.service";
import { checkoutSummaryQuerySchema, idempotencyKeySchema } from "./checkout.validation";

const getUser = (req: Request) => {
  if (!req.user) throw new AppError(401, "User is not authenticated");
  return { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role };
};

export const getCheckoutSummaryHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = checkoutSummaryQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? "Invalid checkout query");
  const summary = await getCheckoutSummary(getUser(req), parsed.data.deliveryArea, parsed.data.shippingMethodId);
  sendResponse(res, { message: "Checkout summary retrieved successfully", data: summary });
});

export const checkoutHandler = catchAsync(async (req: Request, res: Response) => {
  const header = req.headers["idempotency-key"];
  const value = Array.isArray(header) ? header[0] : header;
  const parsed = idempotencyKeySchema.safeParse(value);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? "Idempotency-Key is required");
  const order = await checkout(getUser(req), req.body, parsed.data);
  sendResponse(res, { statusCode: 201, message: "Checkout completed successfully", data: order });
});
