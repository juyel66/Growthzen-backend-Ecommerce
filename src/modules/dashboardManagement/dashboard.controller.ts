import type { Request, Response } from "express";

import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
  getDashboardCharts,
  getDashboardCustomerAnalytics,
  getDashboardOrderAnalytics,
  getDashboardOverview,
  getDashboardPaymentAnalytics,
  getDashboardRecent,
  getDashboardRevenueAnalytics,
  getDashboardStatistics,
} from "./dashboard.service";
import { dashboardQueryValidationSchema } from "./dashboard.validation";

const parseQuery = (req: Request) => {
  const parsed = dashboardQueryValidationSchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "Invalid dashboard query parameters");
  }

  return parsed.data;
};

export const getDashboardStatisticsHandler = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    message: "Dashboard statistics retrieved successfully",
    data: await getDashboardStatistics({ range: "YEARLY" }),
  });
});

export const getDashboardOverviewHandler = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    message: "Dashboard overview retrieved successfully",
    data: await getDashboardOverview(parseQuery(req)),
  });
});

export const getDashboardRevenueHandler = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    message: "Dashboard revenue analytics retrieved successfully",
    data: await getDashboardRevenueAnalytics(parseQuery(req)),
  });
});

export const getDashboardOrdersHandler = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    message: "Dashboard order analytics retrieved successfully",
    data: await getDashboardOrderAnalytics(),
  });
});

export const getDashboardCustomersHandler = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    message: "Dashboard customer analytics retrieved successfully",
    data: await getDashboardCustomerAnalytics(),
  });
});

export const getDashboardPaymentsHandler = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    message: "Dashboard payment analytics retrieved successfully",
    data: await getDashboardPaymentAnalytics(),
  });
});

export const getDashboardChartsHandler = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    message: "Dashboard charts retrieved successfully",
    data: await getDashboardCharts(parseQuery(req)),
  });
});

export const getDashboardRecentHandler = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    message: "Dashboard recent records retrieved successfully",
    data: await getDashboardRecent(parseQuery(req)),
  });
});