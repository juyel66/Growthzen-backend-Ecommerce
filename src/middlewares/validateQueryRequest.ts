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

    req.query = result.data as Request["query"];
    next();
  };
};

export default validateQueryRequest;