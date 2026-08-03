import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import AppError from "../utils/AppError";

const validateRequest = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issue = result.error.issues[0];
      const fieldPath = issue?.path && issue.path.length > 0 ? issue.path.join(".") : null;
      let message = issue?.message ?? "Invalid request body";

      if (fieldPath && !message.toLowerCase().includes(fieldPath.toLowerCase())) {
        message = `${fieldPath}: ${message}`;
      }

      next(new AppError(400, message));
      return;
    }

    const validatedBody = result.data;

    Object.defineProperty(req, "body", {
      configurable: true,
      enumerable: true,
      value: validatedBody,
      writable: true,
    });
    next();
  };
};




export default validateRequest;