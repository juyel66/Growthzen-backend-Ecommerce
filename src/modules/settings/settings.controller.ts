import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { getSettings, updateSettings } from "./settings.service";

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