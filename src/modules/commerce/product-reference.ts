import type { Prisma, Role } from "@prisma/client";
import AppError from "../../utils/AppError";
import prismaClient from "../../config/prisma";
import { calculateFinalPrice, type CalculatedPrice } from "../pricing/pricing.service";
import { BASE_URL, formatPublicUrl } from "../../utils/imageUrl";

export const commerceProductSelect = {
  id: true,
  title: true,
  slug: true,
  thumbnailImage: true,
  productCode: true,
  shortDescription: true,
  customerSellPrice: true,
  salePrice: true,
  specialSaleEnabled: true,
  discountEnabled: true,
  resellerPrice: true,
  discountType: true,
  discountValue: true,
  status: true,
  categoryRel: { select: { discountPercentage: true, discountEnabled: true } },
} satisfies Prisma.ProductSelect;

export type CommerceProductRecord = Prisma.ProductGetPayload<{ select: typeof commerceProductSelect }>;

export interface CommerceProductView {
  id: string;
  title: string;
  slug: string;
  thumbnailImage: string;
  productCode: string;
  shortDescription: string;
  customerSellPrice: number;
  salePrice: number | null;
  specialSaleEnabled: boolean;
  discountEnabled: boolean;
  resellerPrice?: number;
  status: CommerceProductRecord["status"];
}

export type ProductPrice = CalculatedPrice;

export const mapCommerceProduct = (product: CommerceProductRecord, role: Role): CommerceProductView => {
  let thumbnailImage = formatPublicUrl(product.thumbnailImage);
  if (!thumbnailImage) {
    thumbnailImage = `${BASE_URL}/uploads/products/thumbnails/default-product.webp`;
  }
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    thumbnailImage,
    productCode: product.productCode,
    shortDescription: product.shortDescription,
    customerSellPrice: product.customerSellPrice,
    salePrice: product.salePrice,
    specialSaleEnabled: product.specialSaleEnabled,
    discountEnabled: product.discountEnabled,
    ...(role === "RESELLER" || role === "ADMIN" || role === "SUPER_ADMIN"
      ? { resellerPrice: product.resellerPrice }
      : {}),
    status: product.status,
  };
};

export const calculateProductPrice = (product: CommerceProductRecord, role: Role): ProductPrice => {
  return calculateFinalPrice(product, role);
};

export const getActiveCommerceProduct = async (productId: string): Promise<CommerceProductRecord> => {
  const product = await prismaClient.product.findUnique({
    where: { id: productId },
    select: commerceProductSelect,
  });

  if (!product) throw new AppError(404, "Product not found");
  if (product.status !== "ACTIVE") throw new AppError(400, "Product is not active or available");
  return product;
};
