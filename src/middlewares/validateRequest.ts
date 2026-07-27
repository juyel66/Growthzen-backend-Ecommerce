import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import AppError from "../utils/AppError";

const validateRequest = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(new AppError(400, result.error.issues[0]?.message ?? "Invalid request body"));
      return;
    }

    req.body = result.data;
    next();
  };
};




export default validateRequest;