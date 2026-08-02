import fs from "fs/promises";
import path from "path";
import type { Prisma, Role } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import type { ProductAttribute, ProductCreateInput, ProductUpdateInput, ProductView } from "./products.interface";
import { normalizeProductCategory } from "./products.category";

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

  // Dynamic Category Discount Calculation
  const categoryDiscount = product.categoryRel?.discountEnabled ? (product.categoryRel.discountPercentage ?? 0) : 0;
  const originalPrice = product.customerSellPrice;
  const discountAmount = Number(((originalPrice * categoryDiscount) / 100).toFixed(2));
  const finalPrice = Math.max(0, Number((originalPrice - discountAmount).toFixed(2)));

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
    originalPrice,
    categoryDiscount,
    discountAmount,
    finalPrice,
    ...(isAdmin || isReseller ? { resellerPrice: product.resellerPrice } : {}),
    salePrice: product.salePrice,
    discountType: product.discountType,
    discountValue: product.discountValue,
    taxRate: product.taxRate,
    couponCode: product.couponCode,
    attributes,
    enableSize: Boolean(sizeAttribute?.values.length),
    availableSizes: sizeAttribute?.values ?? [],
    thumbnailImage: product.thumbnailImage,
    productImages: product.productImages,
    productVideos: product.productVideos,
    status: product.status,
    isFeatured: product.isFeatured,
    averageRating: product.reviews.length ? Number((ratingTotal / product.reviews.length).toFixed(2)) : 0,
    reviewCount: product.reviews.length,
    ratingBreakdown: breakdown,
    latestReviews: product.reviews.slice(0, 5).map((review) => ({
      id: review.id,
      reviewerName: review.user.name,
      rating: review.rating,
      comment: review.comment,
      images: review.images,
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
): Prisma.ProductCreateInput => ({
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
  salePrice: payload.salePrice ?? null,
  discountType: payload.discountType ?? null,
  discountValue: payload.discountValue ?? null,
  taxRate: payload.taxRate ?? null,
  couponCode: payload.couponCode ?? null,
  attributes: configureSizeAttribute(payload.attributes ?? [], payload.enableSize, payload.availableSizes) as unknown as Prisma.InputJsonValue,
  status: payload.status ?? "DRAFT",
  thumbnailImage: payload.thumbnailImage,
  productImages: payload.productImages ?? [],
  productVideos: payload.productVideos ?? [],
  isFeatured: payload.isFeatured ?? false,
  createdBy: { connect: { id: createdById } },
});

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

  const { attributes, enableSize, availableSizes, title, categoryId, category, ...fields } = payload;
  const nextAttributes = attributes !== undefined || enableSize !== undefined
    ? configureSizeAttribute(attributes ?? parseAttributes(existing.attributes), enableSize, availableSizes)
    : undefined;

  let resolvedCategory: { categoryId: string; categoryName: string } | undefined;
  if (categoryId || category) {
    resolvedCategory = await resolveAndValidateCategory(categoryId, category);
  }

  const data: Prisma.ProductUpdateInput = {
    ...fields,
    ...(nextAttributes !== undefined ? { attributes: nextAttributes as unknown as Prisma.InputJsonValue } : {}),
    ...(title ? { title, slug: await buildUniqueSlug(title, id) } : {}),
    ...(resolvedCategory ? {
      category: resolvedCategory.categoryName,
      categoryRel: { connect: { id: resolvedCategory.categoryId } },
    } : {}),
  };

  const product = await prismaClient.product.update({ where: { id }, data, include: productInclude });

  const obsoleteFiles = [
    ...(payload.thumbnailImage && payload.thumbnailImage !== existing.thumbnailImage ? [existing.thumbnailImage] : []),
    ...(payload.productImages ? existing.productImages.filter((file) => !payload.productImages?.includes(file)) : []),
    ...(payload.productVideos ? existing.productVideos.filter((file) => !payload.productVideos?.includes(file)) : []),
  ];
  await deleteLocalFiles(obsoleteFiles);
  return mapProduct(product, "ADMIN");
};

export const deleteProduct = async (id: string): Promise<void> => {
  const product = await prismaClient.product.findUnique({
    where: { id },
    select: { thumbnailImage: true, productImages: true, productVideos: true },
  });
  if (!product) throw new AppError(404, "Product not found");
  await prismaClient.product.delete({ where: { id } });
  await deleteLocalFiles([product.thumbnailImage, ...product.productImages, ...product.productVideos]);
};

const deleteLocalFiles = async (filePaths: string[]): Promise<void> => {
  const paths = [...new Set(filePaths
    .filter((file) => file.startsWith("/uploads/") || file.startsWith("uploads/"))
    .map((file) => path.resolve(process.cwd(), file.replace(/^\/+/, ""))))];
  await Promise.all(paths.map(async (file) => {
    try {
      await fs.unlink(file);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  }));
};
