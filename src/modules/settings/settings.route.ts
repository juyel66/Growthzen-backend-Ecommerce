import { Router } from "express";
import { authenticate, authorizeRoles, optionalAuthenticate } from "../../middlewares/auth";
import { bannerUpload, mapBannerUploadToBody } from "../../middlewares/upload";
import validateRequest from "../../middlewares/validateRequest";
import {
  createBannerHandler,
  deleteBannerHandler,
  getBannerByIdHandler,
  getBannersHandler,
  updateBannerHandler,
} from "./banner.controller";
import {
  createBannerValidationSchema,
  updateBannerValidationSchema,
} from "./banner.validation";
import {
  getCategoryDiscountsHandler,
  getSettingsHandler,
  updateCategoryDiscountHandler,
  updateSettingsHandler,
} from "./settings.controller";
import { updateSettingsValidationSchema } from "./settings.validation";

const router = Router();

// ==========================================
// 1. BANNER / CAROUSEL MANAGEMENT ROUTES
// ==========================================

/**
 * @swagger
 * /settings/banners:
 *   get:
 *     summary: Get Homepage Banners / Carousel Items
 *     description: Returns homepage banners ordered by displayOrder ASC. Public requests receive active banners (isActive = true). Admin users can query all banners including inactive ones.
 *     tags: [Settings]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: isActive, schema: { type: boolean } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [displayOrder, createdAt, title], default: displayOrder } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc], default: asc } }
 *     responses:
 *       200:
 *         description: Banners retrieved successfully
 */
router.get("/banners", optionalAuthenticate, getBannersHandler);

/**
 * @swagger
 * /settings/banners/{id}:
 *   get:
 *     summary: Get Banner Details
 *     tags: [Settings]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Banner details retrieved successfully }
 *       404: { description: Banner not found }
 */
router.get("/banners/:id", optionalAuthenticate, getBannerByIdHandler);

/**
 * @swagger
 * /settings/banners:
 *   post:
 *     summary: Create / Upload Homepage Banner
 *     description: Uploads a new homepage banner. Only accessible by ADMIN and SUPER_ADMIN.
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image: { type: string, format: binary, description: "Banner image file" }
 *               title: { type: string, example: "Mega Summer Sale" }
 *               subtitle: { type: string, example: "Up to 50% Off on Electronics" }
 *               buttonText: { type: string, example: "Shop Now" }
 *               buttonUrl: { type: string, example: "/category/electronics" }
 *               displayOrder: { type: integer, example: 1 }
 *               isActive: { type: boolean, example: true }
 *         application/json:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image: { type: string, example: "/uploads/products/banners/banner1.jpg" }
 *               title: { type: string, example: "Mega Summer Sale" }
 *               subtitle: { type: string, example: "Up to 50% Off on Electronics" }
 *               buttonText: { type: string, example: "Shop Now" }
 *               buttonUrl: { type: string, example: "/category/electronics" }
 *               displayOrder: { type: integer, example: 1 }
 *               isActive: { type: boolean, example: true }
 *     responses:
 *       201: { description: Banner created successfully }
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.post(
  "/banners",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  bannerUpload,
  mapBannerUploadToBody,
  validateRequest(createBannerValidationSchema),
  createBannerHandler
);

/**
 * @swagger
 * /settings/banners/{id}:
 *   patch:
 *     summary: Update Homepage Banner
 *     description: Updates banner fields, image, display order, or active status. Only accessible by ADMIN and SUPER_ADMIN.
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image: { type: string, format: binary }
 *               title: { type: string }
 *               subtitle: { type: string }
 *               buttonText: { type: string }
 *               buttonUrl: { type: string }
 *               displayOrder: { type: integer }
 *               isActive: { type: boolean }
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               subtitle: { type: string }
 *               image: { type: string }
 *               buttonText: { type: string }
 *               buttonUrl: { type: string }
 *               displayOrder: { type: integer }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Banner updated successfully }
 *       404: { description: Banner not found }
 */
router.patch(
  "/banners/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  bannerUpload,
  mapBannerUploadToBody,
  validateRequest(updateBannerValidationSchema),
  updateBannerHandler
);

/**
 * @swagger
 * /settings/banners/{id}:
 *   delete:
 *     summary: Soft Delete Homepage Banner
 *     description: Soft deletes a homepage banner by setting deletedAt timestamp and isActive = false. Only accessible by ADMIN and SUPER_ADMIN.
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Banner deleted successfully }
 *       404: { description: Banner not found }
 */
router.delete(
  "/banners/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  deleteBannerHandler
);

// ==========================================
// 2. APP SYSTEM SETTINGS & CATEGORY DISCOUNTS
// ==========================================

router.get("/", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), getSettingsHandler);

/**
 * @swagger
 * /settings:
 *   patch:
 *     summary: Update System Settings
 *     tags: [Settings]
 *     description: Updates global system configuration across General, Delivery, Payment, SMTP, or Maintenance settings on the single settings record. Only accessible by ADMIN and SUPER_ADMIN.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeName: { type: string, example: "GrowthZen Store" }
 *               companyName: { type: string, example: "GrowthZen Inc." }
 *               supportEmail: { type: string, example: "support@growthzen.com" }
 *               supportPhone: { type: string, example: "+8801700000000" }
 *               currency: { type: string, example: "BDT" }
 *               currencySymbol: { type: string, example: "৳" }
 *               insideDhakaDeliveryCharge: { type: number, example: 60 }
 *               outsideDhakaDeliveryCharge: { type: number, example: 120 }
 *               freeShippingMinOrderAmount: { type: number, example: 2000 }
 *               estimatedDeliveryDays: { type: integer, example: 3 }
 *               codEnabled: { type: boolean, example: true }
 *               bkashEnabled: { type: boolean, example: true }
 *               nagadEnabled: { type: boolean, example: true }
 *               merchantNumber: { type: string, example: "01700000000" }
 *               smtpHost: { type: string, example: "smtp.mailtrap.io" }
 *               smtpPort: { type: integer, example: 587 }
 *               smtpUsername: { type: string, example: "smtp_user" }
 *               smtpPassword: { type: string, example: "smtp_pass" }
 *               senderEmail: { type: string, example: "noreply@growthzen.com" }
 *               maintenanceMode: { type: boolean, example: false }
 *               maintenanceMessage: { type: string, example: "Store is undergoing scheduled maintenance." }
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.patch(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  validateRequest(updateSettingsValidationSchema),
  updateSettingsHandler
);

/**
 * @swagger
 * /settings/category-discounts:
 *   get:
 *     summary: Get Category Discounts
 *     description: Returns category list with discount percentages and discount status directly from Category model (single source of truth).
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Category discounts retrieved successfully
 */
router.get(
  "/category-discounts",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  getCategoryDiscountsHandler
);

/**
 * @swagger
 * /settings/category-discounts/{categoryId}:
 *   patch:
 *     summary: Update Category Discount
 *     description: Updates category discount percentage and discount enabled state directly in Category model.
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: categoryId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               discountPercentage: { type: number, example: 15 }
 *               discountEnabled: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Category discount updated successfully
 */
router.patch(
  "/category-discounts/:categoryId",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  updateCategoryDiscountHandler
);

export default router;