import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { addWishlistItem, clearWishlist, getMyWishlist, removeWishlistItem } from "./wishlist.service";

const getUser = (req: Request) => {
  if (!req.user) throw new AppError(401, "User is not authenticated");
  return { id: req.user.id, role: req.user.role };
};

const getItemId = (req: Request): string => {
  const value = req.params.itemId;
  const itemId = Array.isArray(value) ? value[0] : value;
  if (!itemId) throw new AppError(400, "Wishlist item id is required");
  return itemId;
};

export const addWishlistItemHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await addWishlistItem(getUser(req), req.body);
  sendResponse(res, {
    statusCode: result.alreadyExists ? 200 : 201,
    message: result.alreadyExists ? "Product already exists in wishlist" : "Product added to wishlist successfully",
    data: result.wishlist,
  });
});

export const getMyWishlistHandler = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { message: "Wishlist retrieved successfully", data: await getMyWishlist(getUser(req)) });
});

export const removeWishlistItemHandler = catchAsync(async (req: Request, res: Response) => {
  const wishlist = await removeWishlistItem(getUser(req), getItemId(req));
  sendResponse(res, { message: "Wishlist item removed successfully", data: wishlist });
});

export const clearWishlistHandler = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { message: "Wishlist cleared successfully", data: await clearWishlist(getUser(req)) });
});
