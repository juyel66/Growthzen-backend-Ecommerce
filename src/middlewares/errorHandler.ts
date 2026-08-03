import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import AppError from "../utils/AppError";
import { MAX_IMAGE_SIZE_MB } from "./upload";

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction): Response => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      error: null,
    });
  }

  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? `Maximum image size is ${MAX_IMAGE_SIZE_MB} MB`
      : error.message;

    return res.status(400).json({
      success: false,
      message,
      error: null,
    });
  }

  if (error instanceof Error && (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError")) {
    return res.status(401).json({
      success: false,
      message: error.name === "TokenExpiredError" ? "Access token expired. Use refresh-token endpoint." : "Invalid or expired token",
      error: null,
    });
  }

  const message = error instanceof Error ? error.message : "Something went wrong";

  return res.status(500).json({
    success: false,
    message,
    error: null,
  });
};