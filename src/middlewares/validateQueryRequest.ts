import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

import AppError from "../utils/AppError";

const validateQueryRequest = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      next(new AppError(400, result.error.issues[0]?.message ?? "Invalid query parameters"));
      return;
    }

    const validatedQuery = result.data as Request["query"];

    Object.defineProperty(req, "query", {
      configurable: true,
      enumerable: true,
      value: validatedQuery,
      writable: true,
    });
    next();
  };
};

export default validateQueryRequest;