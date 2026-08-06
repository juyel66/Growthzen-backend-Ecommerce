import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { createProduct, deleteProduct, generateIdentifiers, getProductById, getProducts, updateProduct } from "./products.service";

export const generateProductIdentifiersHandler = catchAsync(async (req: Request, res: Response) => {
  const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
  const categoryText = typeof req.query.category === "string" ? req.query.category : undefined;

  const data = await generateIdentifiers(categoryId, categoryText);

  sendResponse(res, {
    message: "Identifiers generated successfully",
    data,
  });
});

const getParamId = (value: string | string[]): string => {
  return Array.isArray(value) ? value[0] : value;
};

export const createProductHandler = catchAsync(async (req: Request, res: Response) => {
  const viewerId = req.user?.id;

  if (!viewerId) {
    throw new AppError(401, "User is not authenticated");
  }

  const product = await createProduct(req.body, viewerId);

  sendResponse(res, {
    statusCode: 201,
    message: "Product created successfully",
    data: product,
  });
});

export const getProductsHandler = catchAsync(async (req: Request, res: Response) => {
  const viewerRole = req.user?.role;
  const products = await getProducts(viewerRole);

  sendResponse(res, {
    message: "Products retrieved successfully",
    data: products,
  });
});

export const getProductByIdHandler = catchAsync(async (req: Request, res: Response) => {
  const viewerRole = req.user?.role;
  const productId = getParamId(req.params.id);

  if (!productId) {
    throw new AppError(400, "Product id is required");
  }

  const product = await getProductById(productId, viewerRole);

  sendResponse(res, {
    message: "Product retrieved successfully",
    data: product,
  });
});

export const updateProductHandler = catchAsync(async (req: Request, res: Response) => {
  const productId = getParamId(req.params.id);

  if (!productId) {
    throw new AppError(400, "Product id is required");
  }

  const product = await updateProduct(productId, req.body);

  sendResponse(res, {
    message: "Product updated successfully",
    data: product,
  });
});

export const deleteProductHandler = catchAsync(async (req: Request, res: Response) => {
  const productId = getParamId(req.params.id);

  if (!productId) {
    throw new AppError(400, "Product id is required");
  }

  await deleteProduct(productId);

  sendResponse(res, {
    message: "Product deleted successfully",
  });
});