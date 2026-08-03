import fs from "fs/promises";
import path from "path";
import type { Prisma, Role } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import {
  BASE_URL,
  formatPublicUrl,
  formatPublicUrlArray,
  logImageFlow,
  toRelativePath,
} from "../../utils/imageUrl";
import { deleteFileFromStorage } from "../../services/storage.service";
import type { ProductAttribute, ProductCreateInput, ProductUpdateInput, ProductView } from "./products.interface";
import { normalizeProductCategory } from "./products.category";
import { calculateFinalPrice } from "../pricing/pricing.service";

const productInclude = {
  createdBy: { select: { name: true, email: true } },
  categoryRel: { select: { id: true, name: true, slug: true, discountPercentage: true, discountEnabled: true } },
  reviews: {
    where: { status: "APPROVED" as const },
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      rating: true,
      comment: true,
      images: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  },
} satisfies Prisma.ProductInclude;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const parseAttributes = (value: Prisma.JsonValue): ProductAttribute[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const name = item.name;
    const values = item.values;
    if (typeof name !== "string" || !Array.isArray(values) || !values.every((entry) => typeof entry === "string")) return [];
    return [{ name, values }];
  });
};

const isSizeAttribute = (attribute: ProductAttribute): boolean => attribute.name.trim().toLowerCase() === "size";

const configureSizeAttribute = (
  attributes: ProductAttribute[],
  enableSize: boolean | undefined,
  availableSizes: readonly string[] | undefined,
): ProductAttribute[] => {
  if (enableSize === undefined) return attributes;
  const withoutSize = attributes.filter((attribute) => !isSizeAttribute(attribute));
  if (!enableSize) return withoutSize;
  return [...withoutSize, { name: "Size", values: [...(availableSizes ?? [])] }];
};

const createSlugBase = (title: string): string => title
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "") || "product";

const buildUniqueSlug = async (title: string, excludeProductId?: string): Promise<string> => {
  const baseSlug = createSlugBase(title);
  for (let suffix = 0; ; suffix += 1) {
    const slug = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
    const existing = await prismaClient.product.findFirst({
      where: { slug, ...(excludeProductId ? { id: { not: excludeProductId } } : {}) },
      select: { id: true },
    });
    if (!existing) return slug;
  }
};

const mapProduct = (product: ProductRecord, viewerRole?: Role): ProductView => {
  const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingTotal = 0;
  product.reviews.forEach((review) => {
    if (review.rating >= 1 && review.rating <= 5) {
      const rating = review.rating as 1 | 2 | 3 | 4 | 5;
      breakdown[rating] += 1;
      ratingTotal += rating;
    }
  });

  const isAdmin = viewerRole === "ADMIN" || viewerRole === "SUPER_ADMIN";
  const isReseller = viewerRole === "RESELLER";
  const attributes = parseAttributes(product.attributes);
  const sizeAttribute = attributes.find(isSizeAttribute);

  // Centralized Pricing Calculation
  const price = calculateFinalPrice(product, viewerRole);

  const rawThumbnail = toRelativePath(product.thumbnailImage) || (Array.isArray(product.productImages) && product.productImages[0] ? toRelativePath(product.productImages[0]) : "");
  let thumbnailImage = formatPublicUrl(rawThumbnail);
  if (!thumbnailImage) {
    thumbnailImage = `${BASE_URL}/uploads/products/thumbnails/default-product.webp`;
  }

  const productImages = formatPublicUrlArray(Array.isArray(product.productImages) ? product.productImages : []);
  const productVideos = formatPublicUrlArray(Array.isArray(product.productVideos) ? product.productVideos : []);

  logImageFlow(`mapProduct [${product.id}]`, {
    dbThumbnail: product.thumbnailImage,
    dbProductImages: product.productImages,
    dbProductVideos: product.productVideos,
  }, {
    responseThumbnail: thumbnailImage,
    responseProductImages: productImages,
    responseProductVideos: productVideos,
  });

  return {
    id: product.id,
    title: product.title,
    shortDescription: product.shortDescription,
    description: product.description,
    slug: product.slug,
    productCode: product.productCode,
    barcode: product.barcode,
    categoryId: product.categoryId,
    category: product.categoryRel?.name ?? product.category ?? "",
    categoryDetails: product.categoryRel
      ? {
          id: product.categoryRel.id,
          name: product.categoryRel.name,
          slug: product.categoryRel.slug,
          discountPercentage: product.categoryRel.discountPercentage,
          discountEnabled: product.categoryRel.discountEnabled,
        }
      : null,
    ...(isAdmin ? { costPrice: product.costPrice } : {}),
    customerSellPrice: product.customerSellPrice,
    originalPrice: price.originalPrice,
    categoryDiscount: price.categoryDiscount,
    discountAmount: price.discountAmount,
    finalPrice: price.finalPrice,
    ...(isAdmin || isReseller ? { resellerPrice: product.resellerPrice } : {}),
    salePrice: product.salePrice,
    discountType: product.discountType,
    discountValue: product.discountValue,
    taxRate: product.taxRate,
    couponCode: product.couponCode,
    attributes,
    enableSize: Boolean(sizeAttribute?.values.length),
    availableSizes: sizeAttribute?.values ?? [],
    thumbnailImage,
    productImages,
    productVideos,
    status: product.status,
    isFeatured: product.isFeatured,
    specialSaleEnabled: product.specialSaleEnabled ?? false,
    discountEnabled: product.discountEnabled ?? false,
    averageRating: product.reviews.length ? Number((ratingTotal / product.reviews.length).toFixed(2)) : 0,
    reviewCount: product.reviews.length,
    ratingBreakdown: breakdown,
    latestReviews: product.reviews.slice(0, 5).map((review) => ({
      id: review.id,
      reviewerName: review.user.name,
      rating: review.rating,
      comment: review.comment,
      images: formatPublicUrlArray(review.images ?? []),
      createdAt: review.createdAt,
    })),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    ...(isAdmin ? {
      createdById: product.createdById,
      createdByName: product.createdBy?.name ?? null,
      createdByEmail: product.createdBy?.email ?? null,
    } : {}),
  };
};

const assertUniqueIdentifiers = async (productCode: string | undefined, barcode: string | null | undefined, excludeId?: string): Promise<void> => {
  if (!productCode && !barcode) return;
  const duplicate = await prismaClient.product.findFirst({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        ...(productCode ? [{ productCode }] : []),
        ...(barcode ? [{ barcode }] : []),
      ],
    },
    select: { productCode: true, barcode: true },
  });
  if (!duplicate) return;
  if (productCode && duplicate.productCode === productCode) throw new AppError(409, "Product code already exists");
  throw new AppError(409, "Barcode already exists");
};

const resolveAndValidateCategory = async (
  categoryId?: string,
  categoryText?: string
): Promise<{ categoryId: string; categoryName: string }> => {
  if (categoryId) {
    const cat = await prismaClient.category.findFirst({
      where: { id: categoryId, status: "ACTIVE", deletedAt: null },
    });
    if (!cat) {
      throw new AppError(400, "Invalid or inactive category selected");
    }
    return { categoryId: cat.id, categoryName: cat.name };
  }

  if (categoryText && categoryText.trim()) {
    const name = normalizeProductCategory(categoryText);
    let cat = await prismaClient.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, deletedAt: null },
    });

    if (!cat) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "category";
      cat = await prismaClient.category.create({
        data: { name, slug: `${slug}-${Date.now().toString(36)}`, status: "ACTIVE" },
      });
    } else if (cat.status !== "ACTIVE") {
      throw new AppError(400, `Category "${cat.name}" is inactive`);
    }

    return { categoryId: cat.id, categoryName: cat.name };
  }

  throw new AppError(400, "Category is required");
};

const toCreateData = (
  payload: ProductCreateInput,
  slug: string,
  createdById: string,
  resolvedCategory: { categoryId: string; categoryName: string }
): Prisma.ProductCreateInput => {
  const specialSaleEnabled = payload.specialSaleEnabled ?? false;
  const discountEnabled = payload.discountEnabled ?? false;
  return {
    title: payload.title,
    shortDescription: payload.shortDescription,
    description: payload.description,
    slug,
    productCode: payload.productCode,
    barcode: payload.barcode ?? null,
    category: resolvedCategory.categoryName,
    categoryRel: { connect: { id: resolvedCategory.categoryId } },
    costPrice: payload.costPrice,
    customerSellPrice: payload.customerSellPrice,
    resellerPrice: payload.resellerPrice,
    specialSaleEnabled,
    discountEnabled,
    salePrice: specialSaleEnabled ? (payload.salePrice ?? null) : null,
    discountType: payload.discountType ?? null,
    discountValue: payload.discountValue ?? null,
    taxRate: payload.taxRate ?? null,
    couponCode: payload.couponCode ?? null,
    attributes: configureSizeAttribute(payload.attributes ?? [], payload.enableSize, payload.availableSizes) as unknown as Prisma.InputJsonValue,
    status: payload.status ?? "DRAFT",
    thumbnailImage: toRelativePath(payload.thumbnailImage),
    productImages: (payload.productImages ?? []).map(toRelativePath).filter(Boolean),
    productVideos: (payload.productVideos ?? []).map(toRelativePath).filter(Boolean),
    isFeatured: payload.isFeatured ?? false,
    createdBy: { connect: { id: createdById } },
  };
};

export const createProduct = async (payload: ProductCreateInput, createdById: string): Promise<ProductView> => {
  await assertUniqueIdentifiers(payload.productCode, payload.barcode);
  const resolvedCategory = await resolveAndValidateCategory(payload.categoryId, payload.category);
  const product = await prismaClient.product.create({
    data: toCreateData(payload, await buildUniqueSlug(payload.title), createdById, resolvedCategory),
    include: productInclude,
  });
  return mapProduct(product, "ADMIN");
};

export const getProducts = async (viewerRole?: Role): Promise<ProductView[]> => {
  const products = await prismaClient.product.findMany({ orderBy: { createdAt: "desc" }, include: productInclude });
  return products.map((product) => mapProduct(product, viewerRole));
};

export const getProductById = async (id: string, viewerRole?: Role): Promise<ProductView> => {
  const product = await prismaClient.product.findUnique({ where: { id }, include: productInclude });
  if (!product) throw new AppError(404, "Product not found");
  return mapProduct(product, viewerRole);
};

export const updateProduct = async (id: string, payload: ProductUpdateInput): Promise<ProductView> => {
  const existing = await prismaClient.product.findUnique({
    where: { id },
    select: { id: true, attributes: true, thumbnailImage: true, productImages: true, productVideos: true, categoryId: true, category: true },
  });
  if (!existing) throw new AppError(404, "Product not found");
  await assertUniqueIdentifiers(payload.productCode, payload.barcode, id);

  const { attributes, enableSize, availableSizes, title, categoryId, category, deletedProductImages, deleteThumbnail, ...fields } = payload;
  if (fields.specialSaleEnabled === false) {
    fields.salePrice = null;
  }
  const nextAttributes = attributes !== undefined || enableSize !== undefined
    ? configureSizeAttribute(attributes ?? parseAttributes(existing.attributes), enableSize, availableSizes)
    : undefined;

  let resolvedCategory: { categoryId: string; categoryName: string } | undefined;
  if (categoryId || category) {
    resolvedCategory = await resolveAndValidateCategory(categoryId, category);
  }

  let nextThumbnailImage: string | undefined;
  if (deleteThumbnail) {
    await deleteFileFromStorage(existing.thumbnailImage);
    nextThumbnailImage = "";
  } else if (payload.thumbnailImage !== undefined) {
    const rel = toRelativePath(payload.thumbnailImage);
    if (rel) {
      nextThumbnailImage = rel;
    }
  }

  // Handle explicit deletedProductImages
  let currentImages = existing.productImages.map(toRelativePath).filter(Boolean);
  if (deletedProductImages && Array.isArray(deletedProductImages) && deletedProductImages.length > 0) {
    const deletedRelSet = new Set(deletedProductImages.map(toRelativePath).filter(Boolean));
    for (const imgToDelete of deletedRelSet) {
      await deleteFileFromStorage(imgToDelete);
    }
    currentImages = currentImages.filter((img) => !deletedRelSet.has(img));
  }

  let nextProductImages: string[] | undefined;
  if (payload.productImages !== undefined) {
    const normalizedPayload = payload.productImages.map(toRelativePath).filter(Boolean);
    if (normalizedPayload.length > 0) {
      nextProductImages = Array.from(new Set([...currentImages, ...normalizedPayload]));
    } else if (payload.productImages.length === 0) {
      nextProductImages = [];
    }
  } else if (deletedProductImages && deletedProductImages.length > 0) {
    nextProductImages = currentImages;
  }

  let nextProductVideos: string[] | undefined;
  if (payload.productVideos !== undefined) {
    const normalizedPayload = payload.productVideos.map(toRelativePath).filter(Boolean);
    if (normalizedPayload.length > 0) {
      const existingRel = existing.productVideos.map(toRelativePath).filter(Boolean);
      nextProductVideos = Array.from(new Set([...existingRel, ...normalizedPayload]));
    } else if (payload.productVideos.length === 0) {
      nextProductVideos = [];
    }
  }

  const data: Prisma.ProductUpdateInput = {
    ...fields,
    ...(nextThumbnailImage !== undefined ? { thumbnailImage: nextThumbnailImage } : {}),
    ...(nextProductImages !== undefined ? { productImages: nextProductImages } : {}),
    ...(nextProductVideos !== undefined ? { productVideos: nextProductVideos } : {}),
    ...(nextAttributes !== undefined ? { attributes: nextAttributes as unknown as Prisma.InputJsonValue } : {}),
    ...(title ? { title, slug: await buildUniqueSlug(title, id) } : {}),
    ...(resolvedCategory ? {
      category: resolvedCategory.categoryName,
      categoryRel: { connect: { id: resolvedCategory.categoryId } },
    } : {}),
  };

  const product = await prismaClient.product.update({ where: { id }, data, include: productInclude });

  const existingThumbnailRel = toRelativePath(existing.thumbnailImage);
  const existingImagesRel = existing.productImages.map(toRelativePath).filter(Boolean);
  const existingVideosRel = existing.productVideos.map(toRelativePath).filter(Boolean);

  const obsoleteFiles = [
    ...(nextThumbnailImage && nextThumbnailImage !== existingThumbnailRel ? [existingThumbnailRel] : []),
    ...(nextProductImages ? existingImagesRel.filter((file) => !nextProductImages?.includes(file)) : []),
    ...(nextProductVideos ? existingVideosRel.filter((file) => !nextProductVideos?.includes(file)) : []),
  ];

  for (const obsolete of obsoleteFiles) {
    await deleteFileFromStorage(obsolete);
  }

  return mapProduct(product, "ADMIN");
};

export const deleteProduct = async (id: string): Promise<void> => {
  const product = await prismaClient.product.findUnique({
    where: { id },
    select: { thumbnailImage: true, productImages: true, productVideos: true },
  });
  if (!product) throw new AppError(404, "Product not found");
  await prismaClient.product.delete({ where: { id } });

  const filesToDelete = [
    product.thumbnailImage,
    ...(Array.isArray(product.productImages) ? product.productImages : []),
    ...(Array.isArray(product.productVideos) ? product.productVideos : []),
  ].filter(Boolean);

  for (const fileUrl of filesToDelete) {
    await deleteFileFromStorage(fileUrl);
  }
};
