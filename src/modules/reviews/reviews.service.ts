import type { ReviewStatus } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import type { CreateReviewInput, ProductReviewStats, PublicReviewView, AdminReviewView } from "./reviews.interface";

export const createReview = async (userId: string, payload: CreateReviewInput) => {
  const { orderItemId, rating, comment, images } = payload;

  const orderItem = await prismaClient.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      order: true,
      product: true,
      // check if review exists
      review: true,
    },
  });

  if (!orderItem) {
    throw new AppError(404, "Order item not found");
  }

  const order = orderItem.order;

  if (!order) {
    throw new AppError(404, "Order not found for this item");
  }

  if (order.userId !== userId) {
    throw new AppError(403, "You can only review products you purchased");
  }

  if (order.status !== "DELIVERED") {
    throw new AppError(400, "Order is not delivered yet");
  }

  if (orderItem.review) {
    throw new AppError(400, "This order item already has a review");
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError(400, "Rating must be an integer between 1 and 5");
  }

  const next = await prismaClient.review.create({
    data: {
      productId: orderItem.productId,
      orderId: order.id,
      orderItemId: orderItem.id,
      userId,
      rating,
      comment: comment ?? null,
      images: images ?? [],
      status: "APPROVED",
    },
  });

  return next;
};

export const getProductReviews = async (productId: string): Promise<ProductReviewStats> => {
  const [avgResult, totalCount, five, four, three, two, one, reviews] = await Promise.all([
    prismaClient.review.aggregate({ where: { productId, status: "APPROVED" }, _avg: { rating: true } }),
    prismaClient.review.count({ where: { productId, status: "APPROVED" } }),
    prismaClient.review.count({ where: { productId, status: "APPROVED", rating: 5 } }),
    prismaClient.review.count({ where: { productId, status: "APPROVED", rating: 4 } }),
    prismaClient.review.count({ where: { productId, status: "APPROVED", rating: 3 } }),
    prismaClient.review.count({ where: { productId, status: "APPROVED", rating: 2 } }),
    prismaClient.review.count({ where: { productId, status: "APPROVED", rating: 1 } }),
    prismaClient.review.findMany({
      where: { productId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const averageRating = avgResult._avg.rating ? Number(avgResult._avg.rating.toFixed(2)) : 0;

  const mappedReviews: PublicReviewView[] = reviews.map((r) => ({
    id: r.id,
    reviewerName: r.user?.name ?? null,
    reviewerProfileImage: null,
    rating: r.rating,
    comment: r.comment ?? null,
    images: r.images ?? [],
    createdAt: r.createdAt,
  }));

  return {
    averageRating,
    ratingCount: totalCount,
    fiveStar: five,
    fourStar: four,
    threeStar: three,
    twoStar: two,
    oneStar: one,
    reviews: mappedReviews,
  };
};

export const getMyReviews = async (userId: string) => {
  const reviews = await prismaClient.review.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { id: true, title: true, thumbnailImage: true, productCode: true } } },
  });

  return reviews.map((r) => ({
    id: r.id,
    productId: r.productId,
    productCode: r.product?.productCode ?? null,
    productName: r.product?.title ?? null,
    orderId: r.orderId,
    rating: r.rating,
    comment: r.comment ?? null,
    images: r.images ?? [],
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
};

export const adminListReviews = async () : Promise<AdminReviewView[]> => {
  const reviews = await prismaClient.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { id: true, title: true, productCode: true } },
      order: { select: { id: true, orderCode: true, customerName: true, customerPhone: true, userEmail: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return reviews.map((r) => ({
    id: r.id,
    productId: r.productId,
    productCode: r.product?.productCode ?? null,
    productName: r.product?.title ?? null,
    orderCode: r.order?.orderCode ?? null,
    orderId: r.orderId,
    customerName: r.order?.customerName ?? r.user?.name ?? null,
    customerEmail: r.order?.userEmail ?? r.user?.email ?? null,
    customerPhone: r.order?.customerPhone ?? null,
    rating: r.rating,
    comment: r.comment ?? null,
    images: r.images ?? [],
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
};

export const updateReview = async (id: string, data: { rating?: number; comment?: string | null; images?: string[]; status?: ReviewStatus }) => {
  const existing = await prismaClient.review.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Review not found");
  }

  const next = await prismaClient.review.update({
    where: { id },
    data: {
      rating: data.rating ?? undefined,
      comment: data.comment ?? undefined,
      images: data.images ?? undefined,
      status: data.status ?? undefined,
    },
  });

  return next;
};

export const deleteReview = async (id: string) => {
  const existing = await prismaClient.review.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Review not found");
  }

  await prismaClient.review.delete({ where: { id } });
};

export const getReviewFormData = async (userId: string, orderItemId: string) => {
  const orderItem = await prismaClient.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true, product: true, review: true },
  });

  if (!orderItem) {
    throw new AppError(404, "Order item not found");
  }

  const order = orderItem.order;

  if (!order) {
    throw new AppError(404, "Order not found");
  }

  if (order.userId !== userId) {
    throw new AppError(403, "You can only access reviews for your own orders");
  }

  const canReview = order.status === "DELIVERED";

  return {
    orderId: order.id,
    orderCode: order.orderCode,
    productId: orderItem.productId,
    productName: orderItem.product?.title ?? null,
    productImage: orderItem.product?.thumbnailImage ?? null,
    userName: null,
    userEmail: order.userEmail ?? null,
    rating: orderItem.review?.rating ?? null,
    comment: orderItem.review?.comment ?? null,
    previousReview: orderItem.review ?? null,
    canReview,
    reviewed: Boolean(orderItem.review),
    reviewId: orderItem.review?.id ?? null,
  };
};
