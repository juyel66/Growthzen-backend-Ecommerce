import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { addCartItem, clearCart, getMyCart, removeCartItem, updateCartItem } from "./cart.service";

const getUser = (req: Request) => {
  if (!req.user) throw new AppError(401, "User is not authenticated");
  return { id: req.user.id, role: req.user.role };
};

const getItemId = (req: Request): string => {
  const value = req.params.itemId;
  const itemId = Array.isArray(value) ? value[0] : value;
  if (!itemId) throw new AppError(400, "Cart item id is required");
  return itemId;
};

export const addCartItemHandler = catchAsync(async (req: Request, res: Response) => {
  const cart = await addCartItem(getUser(req), req.body);
  sendResponse(res, { statusCode: 201, message: "Product added to cart successfully", data: cart });
});

export const getMyCartHandler = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { message: "Cart retrieved successfully", data: await getMyCart(getUser(req)) });
});

export const updateCartItemHandler = catchAsync(async (req: Request, res: Response) => {
  const cart = await updateCartItem(getUser(req), getItemId(req), req.body);
  sendResponse(res, { message: "Cart item quantity updated successfully", data: cart });
});

export const removeCartItemHandler = catchAsync(async (req: Request, res: Response) => {
  const cart = await removeCartItem(getUser(req), getItemId(req));
  sendResponse(res, { message: "Cart item removed successfully", data: cart });
});

export const clearCartHandler = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { message: "Cart cleared successfully", data: await clearCart(getUser(req)) });
});
