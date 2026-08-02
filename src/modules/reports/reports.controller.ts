import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import type { ExportFormat, ReportQueryOptions } from "./reports.interface";
import {
  exportReportData,
  getCouponReport,
  getCustomerReport,
  getOrderReport,
  getPaymentReport,
  getProductReport,
  getRevenueReport,
  getSalesReport,
  getShippingReport,
} from "./reports.service";
import { reportsQueryValidationSchema } from "./reports.validation";

const parseReportQuery = (req: Request): ReportQueryOptions => {
  const parsed = reportsQueryValidationSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "Invalid report query parameters");
  }
  return parsed.data as ReportQueryOptions;
};

const getExportFormat = (req: Request): ExportFormat => {
  const format = (req.query.format as string)?.toLowerCase() ?? "csv";
  if (!["csv", "xlsx", "pdf"].includes(format)) {
    throw new AppError(400, "Invalid export format. Must be one of: csv, xlsx, pdf");
  }
  return format as ExportFormat;
};

export const getSalesReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const result = await getSalesReport(query);
  sendResponse(res, {
    message: "Sales report generated successfully.",
    data: result.data,
    meta: result.meta,
  });
});

export const getRevenueReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const result = await getRevenueReport(query);
  sendResponse(res, {
    message: "Revenue report generated successfully.",
    data: result.data,
    meta: result.meta,
  });
});

export const getOrderReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const result = await getOrderReport(query);
  sendResponse(res, {
    message: "Order report generated successfully.",
    data: result.data,
    meta: result.meta,
  });
});

export const getProductReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const result = await getProductReport(query);
  sendResponse(res, {
    message: "Product report generated successfully.",
    data: result.data,
    meta: result.meta,
  });
});

export const getCustomerReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const result = await getCustomerReport(query);
  sendResponse(res, {
    message: "Customer report generated successfully.",
    data: result.data,
    meta: result.meta,
  });
});

export const getPaymentReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const result = await getPaymentReport(query);
  sendResponse(res, {
    message: "Payment report generated successfully.",
    data: result.data,
    meta: result.meta,
  });
});

export const getShippingReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const result = await getShippingReport(query);
  sendResponse(res, {
    message: "Shipping report generated successfully.",
    data: result.data,
    meta: result.meta,
  });
});

export const getCouponReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const result = await getCouponReport(query);
  sendResponse(res, {
    message: "Coupon report generated successfully.",
    data: result.data,
    meta: result.meta,
  });
});

export const exportSalesReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const format = getExportFormat(req);
  const { buffer, contentType, fileName } = await exportReportData("sales", format, query);

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.status(200).send(buffer);
});

export const exportRevenueReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const format = getExportFormat(req);
  const { buffer, contentType, fileName } = await exportReportData("revenue", format, query);

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.status(200).send(buffer);
});

export const exportOrderReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const format = getExportFormat(req);
  const { buffer, contentType, fileName } = await exportReportData("orders", format, query);

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.status(200).send(buffer);
});

export const exportProductReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const format = getExportFormat(req);
  const { buffer, contentType, fileName } = await exportReportData("products", format, query);

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.status(200).send(buffer);
});

export const exportCustomerReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const format = getExportFormat(req);
  const { buffer, contentType, fileName } = await exportReportData("customers", format, query);

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.status(200).send(buffer);
});

export const exportPaymentReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const format = getExportFormat(req);
  const { buffer, contentType, fileName } = await exportReportData("payments", format, query);

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.status(200).send(buffer);
});

export const exportShippingReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const format = getExportFormat(req);
  const { buffer, contentType, fileName } = await exportReportData("shipping", format, query);

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.status(200).send(buffer);
});

export const exportCouponReportHandler = catchAsync(async (req: Request, res: Response) => {
  const query = parseReportQuery(req);
  const format = getExportFormat(req);
  const { buffer, contentType, fileName } = await exportReportData("coupons", format, query);

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.status(200).send(buffer);
});
