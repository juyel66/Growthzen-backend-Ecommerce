import type { Prisma, Role } from "@prisma/client";
import AppError from "../../utils/AppError";
import prismaClient from "../../config/prisma";

export const commerceProductSelect = {
  id: true,
  title: true,
  slug: true,
  thumbnailImage: true,
  productCode: true,
  shortDescription: true,
  customerSellPrice: true,
  salePrice: true,
  resellerPrice: true,
  discountType: true,
  discountValue: true,
  status: true,
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
  resellerPrice?: number;
  status: CommerceProductRecord["status"];
}

export interface ProductPrice {
  basePrice: number;
  sellingPrice: number;
  discount: number;
}

const roundMoney = (value: number): number => Number(value.toFixed(2));

export const mapCommerceProduct = (product: CommerceProductRecord, role: Role): CommerceProductView => ({
  id: product.id,
  title: product.title,
  slug: product.slug,
  thumbnailImage: product.thumbnailImage,
  productCode: product.productCode,
  shortDescription: product.shortDescription,
  customerSellPrice: product.customerSellPrice,
  salePrice: product.salePrice,
  ...(role === "RESELLER" || role === "ADMIN" || role === "SUPER_ADMIN"
    ? { resellerPrice: product.resellerPrice }
    : {}),
  status: product.status,
});

export const calculateProductPrice = (product: CommerceProductRecord, role: Role): ProductPrice => {
  if (role === "RESELLER") {
    return { basePrice: product.resellerPrice, sellingPrice: product.resellerPrice, discount: 0 };
  }

  const basePrice = product.customerSellPrice;
  let sellingPrice = basePrice;

  if (product.salePrice !== null) {
    sellingPrice = Math.min(basePrice, product.salePrice);
  } else if (product.discountType && product.discountValue !== null) {
    const discount = product.discountType === "PERCENTAGE"
      ? (basePrice * product.discountValue) / 100
      : product.discountValue;
    sellingPrice = Math.max(0, basePrice - discount);
  }

  return {
    basePrice: roundMoney(basePrice),
    sellingPrice: roundMoney(sellingPrice),
    discount: roundMoney(basePrice - sellingPrice),
  };
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
