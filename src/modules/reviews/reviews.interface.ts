import type { Review, Role } from "@prisma/client";

export interface CreateReviewInput {
  orderItemId: string;
  rating: number;
  comment?: string | null;
  images?: string[];
}

export interface PublicReviewView {
  id: string;
  reviewerName: string | null;
  reviewerProfileImage: string | null;
  rating: number;
  comment?: string | null;
  images: string[];
  createdAt: Date;
}

export interface ProductReviewStats {
  averageRating: number;
  ratingCount: number;
  fiveStar: number;
  fourStar: number;
  threeStar: number;
  twoStar: number;
  oneStar: number;
  reviews: PublicReviewView[];
}

export interface AdminReviewView {
  id: string;
  productId: string;
  productCode: string | null;
  productName: string | null;
  orderCode: string | null;
  orderId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  rating: number;
  comment?: string | null;
  images: string[];
  status: Review["status"];
  createdAt: Date;
  updatedAt: Date;
}
