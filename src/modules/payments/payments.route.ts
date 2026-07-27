import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { getPaymentHandler, submitManualPaymentHandler } from "./payments.controller";
import { manualPaymentValidationSchema } from "./payments.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /payments/manual:
 *   post:
 *     summary: Submit a manual bKash or Nagad payment
 *     description: Submits transaction details for the authenticated user's pending manual-payment order. Paid amount must equal the server-calculated order total.
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ManualPaymentRequest' }
 *           example: { orderId: "cmorder123", paymentMethod: "BKASH", senderNumber: "+8801700000000", transactionId: "TXN20260728001", paidAmount: 1450, paymentScreenshot: "/uploads/payments/txn.webp" }
 *     responses:
 *       200:
 *         description: Manual payment submitted successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaymentSuccessResponse' }
 *       400: { description: Validation, method, status, or amount error }
 *       401: { description: Authentication required }
 *       404: { description: Payment or order not found }
 *       409: { description: Transaction ID already exists }
 */
router.post("/manual", validateRequest(manualPaymentValidationSchema), submitManualPaymentHandler);

/**
 * @swagger
 * /payments/{paymentId}:
 *   get:
 *     summary: Get a payment
 *     description: Customers can retrieve only payments belonging to their own orders; admins can retrieve any payment.
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PaymentId'
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaymentSuccessResponse' }
 *       401: { description: Authentication required }
 *       404: { description: Payment not found }
 */
router.get("/:paymentId", getPaymentHandler);

export default router;
