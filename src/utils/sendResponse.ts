import type { Response } from "express";

interface SendResponseOptions<T> {
  statusCode?: number;
  message: string;
  data?: T;
}

const sendResponse = <T>(res: Response, options: SendResponseOptions<T>): Response => {
  return res.status(options.statusCode ?? 200).json({
    success: true,
    message: options.message,
    data: options.data ?? null,
  });
};

export default sendResponse;