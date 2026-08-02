import type { Banner, Prisma } from "@prisma/client";
import prismaClient from "../../config/prisma";
import AppError from "../../utils/AppError";
import type { PaginationMeta } from "../categories/category.interface";
import type {
  BannerCreateInput,
  BannerQueryOptions,
  BannerUpdateInput,
  BannerView,
} from "./banner.interface";

const mapBanner = (banner: Banner): BannerView => ({
  id: banner.id,
  title: banner.title,
  subtitle: banner.subtitle,
  image: banner.image,
  buttonText: banner.buttonText,
  buttonUrl: banner.buttonUrl,
  displayOrder: banner.displayOrder,
  isActive: banner.isActive,
  createdAt: banner.createdAt.toISOString(),
  updatedAt: banner.updatedAt.toISOString(),
});

export const createBanner = async (payload: BannerCreateInput): Promise<BannerView> => {
  const banner = await prismaClient.banner.create({
    data: {
      title: payload.title ?? null,
      subtitle: payload.subtitle ?? null,
      image: payload.image,
      buttonText: payload.buttonText ?? null,
      buttonUrl: payload.buttonUrl ?? null,
      displayOrder: payload.displayOrder ?? 0,
      isActive: payload.isActive ?? true,
    },
  });

  return mapBanner(banner);
};

export const getBanners = async (
  options: BannerQueryOptions,
  isPublic = false
): Promise<{ data: BannerView[]; meta: PaginationMeta }> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.BannerWhereInput = {
    deletedAt: null,
    ...(isPublic ? { isActive: true } : {}),
    ...(!isPublic && options.isActive !== undefined ? { isActive: options.isActive } : {}),
    ...(options.search
      ? {
          OR: [
            { title: { contains: options.search, mode: "insensitive" } },
            { subtitle: { contains: options.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const sortBy = options.sortBy ?? "displayOrder";
  const sortOrder = options.sortOrder ?? "asc";

  const [banners, total] = await Promise.all([
    prismaClient.banner.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ [sortBy]: sortOrder }, { createdAt: "desc" }],
    }),
    prismaClient.banner.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: banners.map(mapBanner),
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

export const getBannerById = async (id: string): Promise<BannerView> => {
  const banner = await prismaClient.banner.findFirst({
    where: { id, deletedAt: null },
  });

  if (!banner) {
    throw new AppError(404, "Banner not found");
  }

  return mapBanner(banner);
};

export const updateBanner = async (
  id: string,
  payload: BannerUpdateInput
): Promise<BannerView> => {
  const existing = await prismaClient.banner.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new AppError(404, "Banner not found");
  }

  const updated = await prismaClient.banner.update({
    where: { id },
    data: {
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.subtitle !== undefined ? { subtitle: payload.subtitle } : {}),
      ...(payload.image !== undefined ? { image: payload.image } : {}),
      ...(payload.buttonText !== undefined ? { buttonText: payload.buttonText } : {}),
      ...(payload.buttonUrl !== undefined ? { buttonUrl: payload.buttonUrl } : {}),
      ...(payload.displayOrder !== undefined ? { displayOrder: payload.displayOrder } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
    },
  });

  return mapBanner(updated);
};

export const deleteBanner = async (id: string): Promise<{ id: string }> => {
  const existing = await prismaClient.banner.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new AppError(404, "Banner not found");
  }

  // Soft delete banner
  await prismaClient.banner.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  return { id };
};
