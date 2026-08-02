import type { CategoryStatus, Prisma } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import type {
  CategoryCreateInput,
  CategoryQueryOptions,
  CategoryUpdateInput,
  CategoryView,
  PaginationMeta,
} from "./category.interface";

const categoryInclude = {
  parentCategory: { select: { id: true, name: true, slug: true } },
  subCategories: {
    where: { deletedAt: null },
    select: { id: true, name: true, slug: true },
  },
  _count: {
    select: {
      products: true,
    },
  },
} satisfies Prisma.CategoryInclude;

type CategoryRecord = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>;

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "category";

const mapCategoryView = (cat: CategoryRecord): CategoryView => ({
  id: cat.id,
  name: cat.name,
  slug: cat.slug,
  description: cat.description,
  image: cat.image,
  parentCategoryId: cat.parentCategoryId,
  parentCategory: cat.parentCategory
    ? { id: cat.parentCategory.id, name: cat.parentCategory.name, slug: cat.parentCategory.slug }
    : null,
  subCategories: cat.subCategories.map((sub) => ({
    id: sub.id,
    name: sub.name,
    slug: sub.slug,
  })),
  discountPercentage: cat.discountPercentage,
  discountEnabled: cat.discountEnabled,
  sortOrder: cat.sortOrder,
  showOnHomepage: cat.showOnHomepage,
  status: cat.status,
  metaTitle: cat.metaTitle,
  metaDescription: cat.metaDescription,
  productsCount: cat._count.products,
  createdAt: cat.createdAt.toISOString(),
  updatedAt: cat.updatedAt.toISOString(),
});

export const createCategory = async (payload: CategoryCreateInput): Promise<CategoryView> => {
  const existingName = await prismaClient.category.findFirst({
    where: {
      name: { equals: payload.name.trim(), mode: "insensitive" },
      deletedAt: null,
    },
  });

  if (existingName) {
    throw new AppError(409, "Category with this name already exists");
  }

  const baseSlug = payload.slug ? slugify(payload.slug) : slugify(payload.name);
  const existingSlug = await prismaClient.category.findFirst({
    where: {
      slug: baseSlug,
      deletedAt: null,
    },
  });

  const slug = existingSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

  if (payload.parentCategoryId) {
    const parent = await prismaClient.category.findFirst({
      where: { id: payload.parentCategoryId, deletedAt: null },
    });
    if (!parent) {
      throw new AppError(404, "Parent category not found");
    }
  }

  const category = await prismaClient.category.create({
    data: {
      name: payload.name.trim(),
      slug,
      description: payload.description ?? null,
      image: payload.image ?? null,
      parentCategoryId: payload.parentCategoryId ?? null,
      discountPercentage: payload.discountPercentage ?? 0,
      discountEnabled: payload.discountEnabled ?? false,
      sortOrder: payload.sortOrder ?? 0,
      showOnHomepage: payload.showOnHomepage ?? false,
      status: payload.status ?? "ACTIVE",
      metaTitle: payload.metaTitle ?? null,
      metaDescription: payload.metaDescription ?? null,
    },
    include: categoryInclude,
  });

  return mapCategoryView(category);
};

export const getCategories = async (
  options: CategoryQueryOptions,
  isAdmin = false
): Promise<{ data: CategoryView[]; meta: PaginationMeta }> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const skip = (page - 1) * limit;
  const search = options.search?.trim();

  const where: Prisma.CategoryWhereInput = {
    deletedAt: null,
  };

  // Customers/Public only get ACTIVE categories
  if (!isAdmin) {
    where.status = "ACTIVE";
  } else if (options.status) {
    where.status = options.status as CategoryStatus;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  let orderBy: Prisma.CategoryOrderByWithRelationInput[] = [{ sortOrder: "asc" }, { name: "asc" }];
  if (options.sortBy === "name") {
    orderBy = [{ name: options.sortOrder ?? "asc" }];
  } else if (options.sortBy === "createdAt") {
    orderBy = [{ createdAt: options.sortOrder ?? "desc" }];
  } else if (options.sortBy === "discountPercentage") {
    orderBy = [{ discountPercentage: options.sortOrder ?? "desc" }];
  } else if (options.sortBy === "sortOrder") {
    orderBy = [{ sortOrder: options.sortOrder ?? "asc" }];
  }

  const [categories, total] = await Promise.all([
    prismaClient.category.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: categoryInclude,
    }),
    prismaClient.category.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: categories.map(mapCategoryView),
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

export const getCategoryById = async (id: string, isAdmin = false): Promise<CategoryView> => {
  const category = await prismaClient.category.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(!isAdmin ? { status: "ACTIVE" } : {}),
    },
    include: categoryInclude,
  });

  if (!category) {
    throw new AppError(404, "Category not found");
  }

  return mapCategoryView(category);
};

export const updateCategory = async (
  id: string,
  payload: CategoryUpdateInput
): Promise<CategoryView> => {
  const category = await prismaClient.category.findFirst({
    where: { id, deletedAt: null },
  });

  if (!category) {
    throw new AppError(404, "Category not found");
  }

  if (payload.name && payload.name.trim() !== category.name) {
    const duplicate = await prismaClient.category.findFirst({
      where: {
        name: { equals: payload.name.trim(), mode: "insensitive" },
        id: { not: id },
        deletedAt: null,
      },
    });
    if (duplicate) {
      throw new AppError(409, "Category name already exists");
    }
  }

  let slug: string | undefined;
  if (payload.slug && payload.slug !== category.slug) {
    const baseSlug = slugify(payload.slug);
    const duplicateSlug = await prismaClient.category.findFirst({
      where: {
        slug: baseSlug,
        id: { not: id },
        deletedAt: null,
      },
    });
    slug = duplicateSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;
  }

  if (payload.parentCategoryId !== undefined && payload.parentCategoryId !== null) {
    if (payload.parentCategoryId === id) {
      throw new AppError(400, "Category cannot be its own parent");
    }
    const parent = await prismaClient.category.findFirst({
      where: { id: payload.parentCategoryId, deletedAt: null },
    });
    if (!parent) {
      throw new AppError(404, "Parent category not found");
    }
  }

  const updated = await prismaClient.category.update({
    where: { id },
    data: {
      ...(payload.name ? { name: payload.name.trim() } : {}),
      ...(slug ? { slug } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.image !== undefined ? { image: payload.image } : {}),
      ...(payload.parentCategoryId !== undefined ? { parentCategoryId: payload.parentCategoryId } : {}),
      ...(payload.discountPercentage !== undefined ? { discountPercentage: payload.discountPercentage } : {}),
      ...(payload.discountEnabled !== undefined ? { discountEnabled: payload.discountEnabled } : {}),
      ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
      ...(payload.showOnHomepage !== undefined ? { showOnHomepage: payload.showOnHomepage } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.metaTitle !== undefined ? { metaTitle: payload.metaTitle } : {}),
      ...(payload.metaDescription !== undefined ? { metaDescription: payload.metaDescription } : {}),
    },
    include: categoryInclude,
  });

  return mapCategoryView(updated);
};

export const deleteCategory = async (id: string): Promise<void> => {
  const category = await prismaClient.category.findFirst({
    where: { id, deletedAt: null },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!category) {
    throw new AppError(404, "Category not found");
  }

  // DELETE RULE: Cannot delete category if products belong to it
  if (category._count.products > 0) {
    throw new AppError(
      400,
      `Cannot delete category "${category.name}" because ${category._count.products} product(s) are assigned to it. Disable the category by setting status to INACTIVE instead.`
    );
  }

  await prismaClient.category.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      status: "INACTIVE",
    },
  });
};
