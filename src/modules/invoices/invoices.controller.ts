import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { createOrGetInvoice, getAllInvoicesService, getPublicInvoiceByToken } from "./invoices.service";

const getParamId = (value: string | string[]): string => (Array.isArray(value) ? value[0] : value);

export const getInvoiceHandler = catchAsync(async (req: Request, res: Response) => {
  const rawId = req.params.orderId ?? req.params.id;
  const orderId = getParamId(rawId);

  if (!orderId) {
    throw new AppError(400, "Order id is required");
  }

  const invoice = await createOrGetInvoice(orderId);

  sendResponse(res, {
    message: "Invoice retrieved successfully",
    data: invoice,
  });
});

export const getPublicInvoiceHandler = catchAsync(async (req: Request, res: Response) => {
  const rawToken = req.params.orderCode || req.params.verificationToken || req.params.id;
  const token = getParamId(rawToken);

  if (!token) {
    throw new AppError(400, "Order code or verification token is required");
  }

  const publicData = await getPublicInvoiceByToken(token);

  sendResponse(res, {
    message: "Invoice verification data retrieved successfully",
    data: publicData,
  });
});

export const getAllInvoicesHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await getAllInvoicesService(req.query);

  const summary = {
    totalInvoices: result.summaryStats.totalInvoices,
    totalSales: result.summaryStats.totalSales,
    todayInvoices: result.summaryStats.todayInvoices,
    todaySales: result.summaryStats.todayGrandTotal,
  };

  const pagination = {
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    totalPage: result.meta.totalPage,
  };

  sendResponse(res, {
    message: "Invoices retrieved successfully",
    meta: result.meta,
    data: {
      invoices: result.data,
      pagination,
      summary,
      summaryStats: result.summaryStats,
      totalInvoices: result.summaryStats.totalInvoices,
      totalSales: result.summaryStats.totalSales,
      totalGrandTotal: result.summaryStats.totalGrandTotal,
      todayInvoices: result.summaryStats.todayInvoices,
      todayGrandTotal: result.summaryStats.todayGrandTotal,
    },
  });
});
