import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { approvePayment, getPayment, listPayments, refundPayment, rejectPayment, submitManualPayment } from "./payments.service";
import { paymentListQueryValidationSchema } from "./payments.validation";

const getUser = (req: Request) => {
  if (!req.user) throw new AppError(401, "User is not authenticated");
  return { id: req.user.id, role: req.user.role };
};

const getPaymentId = (req: Request): string => {
  const value = req.params.paymentId;
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new AppError(400, "Payment id is required");
  return id;
};

export const submitManualPaymentHandler = catchAsync(async (req: Request, res: Response) => {
  const payment = await submitManualPayment(getUser(req), req.body);
  sendResponse(res, { message: "Manual payment submitted successfully", data: payment });
});

export const getPaymentHandler = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { message: "Payment retrieved successfully", data: await getPayment(getUser(req), getPaymentId(req)) });
});

export const approvePaymentHandler = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { message: "Payment approved successfully", data: await approvePayment(getUser(req), getPaymentId(req)) });
});

export const rejectPaymentHandler = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { message: "Payment rejected successfully", data: await rejectPayment(getUser(req), getPaymentId(req), req.body) });
});

export const listPaymentsHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = paymentListQueryValidationSchema.safeParse(req.query);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? "Invalid payment filters");
  sendResponse(res, { message: "Payments retrieved successfully", data: await listPayments(parsed.data) });
});

export const refundPaymentHandler = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { message: "Payment refunded successfully", data: await refundPayment(getUser(req), getPaymentId(req), req.body) });
});
