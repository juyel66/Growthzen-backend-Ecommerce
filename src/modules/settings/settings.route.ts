import { Router } from "express";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import {
  getCategoryDiscountsHandler,
  getSettingsHandler,
  updateCategoryDiscountHandler,
  updateSettingsHandler,
} from "./settings.controller";
import { updateSettingsValidationSchema } from "./settings.validation";

const router = Router();

router.use(authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"));

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get System Settings
 *     description: Returns global system settings covering General, Delivery, Payment, SMTP, and Maintenance configurations. Sensitive fields (e.g. smtpPassword) are strictly masked/omitted. Only accessible by ADMIN and SUPER_ADMIN.
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/", getSettingsHandler);

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
router.patch("/", validateRequest(updateSettingsValidationSchema), updateSettingsHandler);

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
router.get("/category-discounts", getCategoryDiscountsHandler);

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
router.patch("/category-discounts/:categoryId", updateCategoryDiscountHandler);

export default router;