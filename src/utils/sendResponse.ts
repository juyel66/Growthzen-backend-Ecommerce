import type { Response } from "express";

interface SendResponseOptions<T> {
  statusCode?: number;
  message: string;
  data?: T;
  meta?: Record<string, unknown> | object;
}

const sendResponse = <T>(res: Response, options: SendResponseOptions<T>): Response => {
  const responsePayload: Record<string, unknown> = {
    success: true,
    message: options.message,
    data: options.data ?? null,
  };

  if (options.meta !== undefined) {
    responsePayload.meta = options.meta;
  }

  return res.status(options.statusCode ?? 200).json(responsePayload);
};

export default sendResponse;