export interface BannerCreateInput {
  title?: string | null;
  subtitle?: string | null;
  image: string;
  buttonText?: string | null;
  buttonUrl?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface BannerUpdateInput {
  title?: string | null;
  subtitle?: string | null;
  image?: string;
  buttonText?: string | null;
  buttonUrl?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface BannerQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: "displayOrder" | "createdAt" | "title";
  sortOrder?: "asc" | "desc";
}

export interface BannerView {
  id: string;
  title: string | null;
  subtitle: string | null;
  image: string;
  buttonText: string | null;
  buttonUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
