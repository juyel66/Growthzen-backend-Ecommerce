import { Router } from "express";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { getSettingsHandler, updateSettingsHandler } from "./settings.controller";
import { updateSettingsValidationSchema } from "./settings.validation";

const router = Router();

router.use(authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"));

router.get("/", getSettingsHandler);
/**
 * @swagger
 * /settings:
 *   patch:
 *     summary: Update App Settings
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             insideDhakaDeliveryCharge: 60
 *             outsideDhakaDeliveryCharge: 120
 *             customerDiscountPercentage: 10
 *             couponCode: "EID2026"
 *             couponActive: true
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.patch("/", validateRequest(updateSettingsValidationSchema), updateSettingsHandler);

export default router;