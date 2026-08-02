import type { CategoryStatus } from "@prisma/client";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CategoryCreateInput {
  name: string;
  slug?: string;
  description?: string | null;
  image?: string | null;
  parentCategoryId?: string | null;
  discountPercentage?: number;
  discountEnabled?: boolean;
  sortOrder?: number;
  showOnHomepage?: boolean;
  status?: CategoryStatus;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface CategoryUpdateInput {
  name?: string;
  slug?: string;
  description?: string | null;
  image?: string | null;
  parentCategoryId?: string | null;
  discountPercentage?: number;
  discountEnabled?: boolean;
  sortOrder?: number;
  showOnHomepage?: boolean;
  status?: CategoryStatus;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface CategoryQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: CategoryStatus;
  sortBy?: "name" | "createdAt" | "sortOrder" | "discountPercentage";
  sortOrder?: "asc" | "desc";
  includeInactive?: boolean;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentCategoryId: string | null;
  parentCategory: CategorySummary | null;
  subCategories: CategorySummary[];
  discountPercentage: number;
  discountEnabled: boolean;
  sortOrder: number;
  showOnHomepage: boolean;
  status: CategoryStatus;
  metaTitle: string | null;
  metaDescription: string | null;
  productsCount: number;
  createdAt: string;
  updatedAt: string;
}
