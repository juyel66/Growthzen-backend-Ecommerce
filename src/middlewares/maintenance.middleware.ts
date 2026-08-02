import type { NextFunction, Request, Response } from "express";
import prismaClient from "../config/prisma";
import { verifyAccessToken } from "../utils/jwt";

export const checkMaintenanceMode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const path = req.path.toLowerCase();
    const originalUrl = req.originalUrl.toLowerCase();

    // Always bypass swagger, static uploads, login, and refresh token endpoints
    if (
      originalUrl.includes("/growthzen-api") ||
      originalUrl.includes("/uploads") ||
      originalUrl.includes("/auth/login") ||
      originalUrl.includes("/auth/refresh-token")
    ) {
      next();
      return;
    }

    // Determine user role if authorization token is provided
    let userRole = req.user?.role;
    if (!userRole && req.headers.authorization?.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        if (token) {
          const decoded = verifyAccessToken(token);
          userRole = decoded.role;
        }
      } catch {
        // Token verification fail will be handled by auth middleware if route requires auth
      }
    }

    // Admins and Super Admins are exempt from maintenance mode
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
      next();
      return;
    }

    // Check database settings for maintenance status
    const settings = await prismaClient.appSetting.findFirst({
      select: { maintenanceMode: true, maintenanceMessage: true },
    });

    if (settings?.maintenanceMode) {
      res.status(503).json({
        success: false,
        message:
          settings.maintenanceMessage ||
          "Store is currently under scheduled maintenance. Please try again later.",
      });
      return;
    }

    next();
  } catch (error) {
    next();
  }
};
