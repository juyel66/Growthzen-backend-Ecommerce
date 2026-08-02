import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
  createBanner,
  deleteBanner,
  getBannerById,
  getBanners,
  updateBanner,
} from "./banner.service";
import { bannerQueryValidationSchema } from "./banner.validation";

const getParamId = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

export const createBannerHandler = catchAsync(async (req: Request, res: Response) => {
  const banner = await createBanner(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: "Banner created successfully",
    data: banner,
  });
});

export const getBannersHandler = catchAsync(async (req: Request, res: Response) => {
  const query = bannerQueryValidationSchema.parse(req.query);
  const isPublic = !req.user || (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN");

  const result = await getBanners(query, isPublic);

  sendResponse(res, {
    message: "Banners retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getBannerByIdHandler = catchAsync(async (req: Request, res: Response) => {
  const bannerId = getParamId(req.params.id);
  if (!bannerId) {
    throw new AppError(400, "Banner ID is required");
  }

  const banner = await getBannerById(bannerId);

  sendResponse(res, {
    message: "Banner details retrieved successfully",
    data: banner,
  });
});

export const updateBannerHandler = catchAsync(async (req: Request, res: Response) => {
  const bannerId = getParamId(req.params.id);
  if (!bannerId) {
    throw new AppError(400, "Banner ID is required");
  }

  const banner = await updateBanner(bannerId, req.body);

  sendResponse(res, {
    message: "Banner updated successfully",
    data: banner,
  });
});

export const deleteBannerHandler = catchAsync(async (req: Request, res: Response) => {
  const bannerId = getParamId(req.params.id);
  if (!bannerId) {
    throw new AppError(400, "Banner ID is required");
  }

  await deleteBanner(bannerId);

  sendResponse(res, {
    message: "Banner deleted successfully",
    data: { id: bannerId },
  });
});
