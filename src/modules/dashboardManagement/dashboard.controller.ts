import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { getDashboardStatistics } from "./dashboard.service";

export const getDashboardStatisticsHandler = catchAsync(async (_req: Request, res: Response) => {
  const statistics = await getDashboardStatistics();

  sendResponse(res, {
    message: "Dashboard statistics retrieved successfully",
    data: statistics,
  });
});