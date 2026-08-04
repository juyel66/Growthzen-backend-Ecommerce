import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { cancelMyOrder, createOrder, getMyOrders, getOrderById, getOrders, updateOrderStatus, trackOrder } from "./orders.service";

const getParamId = (value: string | string[]): string => (Array.isArray(value) ? value[0] : value);

const getQueryValue = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    const trimmed = value[0].trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
};

const parseOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
};

export const createOrderHandler = catchAsync(async (req: Request, res: Response) => {
  const currentUser = req.user;

  const order = await createOrder(
    req.body,
    currentUser
      ? {
          id: currentUser.id,
          role: currentUser.role,
          email: currentUser.email,
        }
      : undefined
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Order created successfully",
    data: order,
  });
});

export const getMyOrdersHandler = catchAsync(async (req: Request, res: Response) => {
  const currentUser = req.user;

  if (!currentUser) {
    throw new AppError(401, "User is not authenticated");
  }

  const orders = await getMyOrders({
    id: currentUser.id,
    role: currentUser.role,
  });

  sendResponse(res, {
    message: "Orders retrieved successfully",
    data: orders,
  });
});

export const getOrderByIdHandler = catchAsync(async (req: Request, res: Response) => {
  const currentUser = req.user;
  const orderId = getParamId(req.params.id);

  if (!currentUser) {
    throw new AppError(401, "User is not authenticated");
  }

  if (!orderId) {
    throw new AppError(400, "Order id is required");
  }

  const order = await getOrderById(orderId, {
    id: currentUser.id,
    role: currentUser.role,
  });

  sendResponse(res, {
    message: "Order retrieved successfully",
    data: order,
  });
});

export const getOrdersHandler = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as Record<string, unknown>;

  const orders = await getOrders({
    page: parseOptionalNumber(query.page),
    limit: parseOptionalNumber(query.limit),
    search: getQueryValue(query.search),
    status: getQueryValue(query.status) as undefined | "PENDING" | "CONFIRMED" | "CANCELLED" | "DELIVERED",
  });

  sendResponse(res, {
    message: "Orders retrieved successfully",
    data: orders,
  });
});

export const updateOrderStatusHandler = catchAsync(async (req: Request, res: Response) => {
  const orderId = getParamId(req.params.id);
  const currentUser = req.user;

  if (!orderId) {
    throw new AppError(400, "Order id is required");
  }

  const order = await updateOrderStatus(
    orderId,
    req.body,
    currentUser
      ? {
          id: currentUser.id,
          role: currentUser.role,
          email: currentUser.email,
        }
      : undefined
  );

  sendResponse(res, {
    message: "Order status updated successfully",
    data: order,
  });
});

export const trackOrderHandler = catchAsync(async (req: Request, res: Response) => {
  const orderCode = getParamId(req.params.orderCode);
  const queryPhone = getQueryValue(req.query.phone) || getQueryValue(req.query.customerPhone);

  if (!orderCode) {
    throw new AppError(400, "Order code is required");
  }

  const order = await trackOrder(orderCode, queryPhone);

  sendResponse(res, {
    message: "Order tracking details retrieved successfully",
    data: order,
  });
});

export const cancelMyOrderHandler = catchAsync(async (req: Request, res: Response) => {
  const currentUser = req.user;
  const orderId = getParamId(req.params.orderId);
  if (!currentUser) throw new AppError(401, "User is not authenticated");
  if (!orderId) throw new AppError(400, "Order id is required");
  const order = await cancelMyOrder(orderId, { id: currentUser.id, role: currentUser.role, email: currentUser.email });
  sendResponse(res, { message: "Order cancelled successfully", data: order });
});
