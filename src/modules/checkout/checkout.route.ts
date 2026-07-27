import { Router } from "express";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { checkoutHandler, getCheckoutSummaryHandler } from "./checkout.controller";
import { checkoutValidationSchema } from "./checkout.validation";

const router = Router();
router.use(authenticate, authorizeRoles("CUSTOMER", "RESELLER"));

/**
 * @swagger
 * /checkout/summary:
 *   get:
 *     summary: Preview my checkout summary
 *     description: Validates the authenticated user's cart and calculates current database prices and shipping without creating an order.
 *     tags: [Checkout]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: deliveryArea
 *         required: false
 *         schema: { type: string, enum: [INSIDE_DHAKA, OUTSIDE_DHAKA], default: INSIDE_DHAKA }
 *     responses:
 *       200:
 *         description: Checkout summary retrieved successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CheckoutSummaryResponse' }
 *       400: { description: Cart is empty or contains an unavailable product }
 *       401: { description: Authentication required }
 */
router.get("/summary", getCheckoutSummaryHandler);

/**
 * @swagger
 * /checkout:
 *   post:
 *     summary: Confirm checkout and create an order
 *     description: Atomically creates an order, immutable price snapshots and a payment record from the authenticated user's cart, then clears that cart.
 *     tags: [Checkout]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema: { type: string, minLength: 8, maxLength: 128 }
 *         example: checkout-20260728-001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CheckoutRequest' }
 *           example:
 *             customerName: Md Juyel Rana
 *             customerPhone: "+8801700000000"
 *             address: House 10, Road 2, Dhaka
 *             deliveryArea: INSIDE_DHAKA
 *             paymentMethod: BKASH
 *     responses:
 *       201:
 *         description: Checkout completed successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CheckoutOrderResponse' }
 *       400: { description: Validation error, empty cart, or unavailable product }
 *       401: { description: Authentication required }
 *       409: { description: Duplicate checkout conflict }
 */
router.post("/", validateRequest(checkoutValidationSchema), checkoutHandler);

export default router;
