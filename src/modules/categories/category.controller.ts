import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import type { CategoryQueryOptions } from "./category.interface";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "./category.service";
import {
  categoryQueryValidationSchema,
  createCategoryValidationSchema,
  updateCategoryValidationSchema,
} from "./category.validation";

const parseQuery = (req: Request): CategoryQueryOptions => {
  const parsed = categoryQueryValidationSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "Invalid category query parameters");
  }
  return parsed.data as CategoryQueryOptions;
};

const getParamId = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

export const createCategoryHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = createCategoryValidationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "Invalid category data");
  }

  const category = await createCategory(parsed.data);

  sendResponse(res, {
    statusCode: 201,
    message: "Category created successfully",
    data: category,
  });
});

export const getCategoriesHandler = catchAsync(async (req: Request, res: Response) => {
  const options = parseQuery(req);
  const userRole = req.user?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const result = await getCategories(options, isAdmin);

  sendResponse(res, {
    message: "Categories retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getCategoryByIdHandler = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req.params.id);
  if (!id) {
    throw new AppError(400, "Category id is required");
  }

  const userRole = req.user?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const category = await getCategoryById(id, isAdmin);

  sendResponse(res, {
    message: "Category retrieved successfully",
    data: category,
  });
});

export const updateCategoryHandler = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req.params.id);
  if (!id) {
    throw new AppError(400, "Category id is required");
  }

  const parsed = updateCategoryValidationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "Invalid update payload");
  }

  const category = await updateCategory(id, parsed.data);

  sendResponse(res, {
    message: "Category updated successfully",
    data: category,
  });
});

export const deleteCategoryHandler = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req.params.id);
  if (!id) {
    throw new AppError(400, "Category id is required");
  }

  await deleteCategory(id);

  sendResponse(res, {
    message: "Category deleted successfully",
    data: null,
  });
});
