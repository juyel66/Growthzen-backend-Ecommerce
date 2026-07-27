import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { createShipping, deleteShipping, getShipping, listShipping, updateShipping } from "./shipping.service";

const id = (req: Request): string => { const value = req.params.id; const result = Array.isArray(value) ? value[0] : value; if (!result) throw new AppError(400, "Shipping method id is required"); return result; };
export const createShippingHandler = catchAsync(async (req: Request, res: Response) => sendResponse(res, { statusCode: 201, message: "Shipping method created successfully", data: await createShipping(req.body) }));
export const listShippingHandler = catchAsync(async (req: Request, res: Response) => sendResponse(res, { message: "Shipping methods retrieved successfully", data: await listShipping(req.user?.role) }));
export const getShippingHandler = catchAsync(async (req: Request, res: Response) => sendResponse(res, { message: "Shipping method retrieved successfully", data: await getShipping(id(req), req.user?.role) }));
export const updateShippingHandler = catchAsync(async (req: Request, res: Response) => sendResponse(res, { message: "Shipping method updated successfully", data: await updateShipping(id(req), req.body) }));
export const deleteShippingHandler = catchAsync(async (req: Request, res: Response) => sendResponse(res, { message: "Shipping method deleted successfully", data: await deleteShipping(id(req)) }));
