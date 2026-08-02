import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
  getCategoryDiscountsSettings,
  getSettings,
  updateCategoryDiscountSetting,
  updateSettings,
} from "./settings.service";

const getParamId = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

export const getSettingsHandler = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getSettings();

  sendResponse(res, {
    message: "Settings retrieved successfully",
    data: settings,
  });
});

export const updateSettingsHandler = catchAsync(async (req: Request, res: Response) => {
  const settings = await updateSettings(req.body);

  sendResponse(res, {
    message: "Settings updated successfully",
    data: settings,
  });
});

export const getCategoryDiscountsHandler = catchAsync(async (_req: Request, res: Response) => {
  const categoryDiscounts = await getCategoryDiscountsSettings();

  sendResponse(res, {
    message: "Category discounts retrieved successfully",
    data: categoryDiscounts,
  });
});

export const updateCategoryDiscountHandler = catchAsync(async (req: Request, res: Response) => {
  const categoryId = getParamId(req.params.categoryId);
  if (!categoryId) {
    throw new AppError(400, "Category id is required");
  }

  const updatedCategory = await updateCategoryDiscountSetting(categoryId, req.body);

  sendResponse(res, {
    message: "Category discount updated successfully",
    data: updatedCategory,
  });
});