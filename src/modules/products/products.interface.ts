import type { DiscountType, ProductStatus, Role } from "@prisma/client";

export interface ProductAttribute {
  name: string;
  values: string[];
}

export interface ProductCategoryDetails {
  id: string;
  name: string;
  slug: string;
  discountPercentage?: number;
  discountEnabled?: boolean;
}

export interface ProductCreateInput {
  title: string;
  shortDescription: string;
  description: string;
  categoryId?: string;
  category?: string;
  costPrice: number;
  customerSellPrice: number;
  resellerPrice: number;
  salePrice?: number | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  taxRate?: number | null;
  couponCode?: string | null;
  productCode?: string;
  barcode?: string | null;
  attributes?: ProductAttribute[];
  enableSize?: boolean;
  availableSizes?: ProductSize[];
  status?: ProductStatus;
  thumbnailImage: string;
  productImages?: string[];
  productVideos?: string[];
  isFeatured?: boolean;
  specialSaleEnabled?: boolean;
  discountEnabled?: boolean;
}

export type ProductUpdateInput = Partial<ProductCreateInput> & {
  deletedProductImages?: string[];
  deleteThumbnail?: boolean;
};

export interface LatestReviewView {
  id: string;
  reviewerName: string | null;
  rating: number;
  comment: string | null;
  images: string[];
  createdAt: Date;
}

export interface ProductView {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  slug: string;
  productCode: string;
  barcode: string | null;
  categoryId: string | null;
  category: string;
  categoryDetails?: ProductCategoryDetails | null;
  costPrice?: number;
  customerSellPrice: number;
  originalPrice: number;
  categoryDiscount: number;
  discountAmount: number;
  finalPrice: number;
  resellerPrice?: number;
  salePrice: number | null;
  discountType: DiscountType | null;
  discountValue: number | null;
  taxRate: number | null;
  couponCode: string | null;
  attributes: ProductAttribute[];
  enableSize: boolean;
  availableSizes: string[];
  thumbnailImage: string;
  productImages: string[];
  productVideos: string[];
  status: ProductStatus;
  isFeatured: boolean;
  specialSaleEnabled: boolean;
  discountEnabled: boolean;
  averageRating: number;
  reviewCount: number;
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  latestReviews: LatestReviewView[];
  createdAt: Date;
  updatedAt: Date;
  createdById?: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
}

export type ProductViewerRole = Role | undefined;

export const PRODUCT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;
export type ProductSize = (typeof PRODUCT_SIZES)[number];
