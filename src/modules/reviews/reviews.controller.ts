import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import * as reviewService from "./reviews.service";
import type { CreateReviewInput } from "./reviews.interface";

export const createReviewHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.user?.id);

  const payload: CreateReviewInput = {
    orderItemId: String(req.body.orderItemId),
    rating: Number(req.body.rating),
    comment: req.body.comment ?? null,
    images: (req.body.images as string[] | undefined) ?? [],
  };

  const review = await reviewService.createReview(userId, payload);

  void sendResponse(res, { message: "Review submitted successfully", data: review });
});

export const getProductReviewsHandler = catchAsync(async (req: Request, res: Response) => {
  const productId = String(req.params.productId);

  const stats = await reviewService.getProductReviews(productId);

  void sendResponse(res, { message: "Product reviews", data: stats });
});

export const getMyReviewsHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.user?.id);

  const items = await reviewService.getMyReviews(userId);

  void sendResponse(res, { message: "My reviews", data: items });
});

export const adminListReviewsHandler = catchAsync(async (_req: Request, res: Response) => {
  const items = await reviewService.adminListReviews();

  void sendResponse(res, { message: "All reviews", data: items });
});

export const updateReviewHandler = catchAsync(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const data = {
    rating: req.body.rating !== undefined ? Number(req.body.rating) : undefined,
    comment: req.body.comment ?? undefined,
    images: (req.body.images as string[] | undefined) ?? undefined,
    status: req.body.status ?? undefined,
  };

  const updated = await reviewService.updateReview(id, data as any);

  void sendResponse(res, { message: "Review updated", data: updated });
});

export const deleteReviewHandler = catchAsync(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  await reviewService.deleteReview(id);

  void sendResponse(res, { message: "Review deleted", data: null });
});

export const getReviewFormHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.user?.id);
  const orderItemId = String(req.params.orderItemId);

  const data = await reviewService.getReviewFormData(userId, orderItemId);

  void sendResponse(res, { message: "Review form data", data });
});
