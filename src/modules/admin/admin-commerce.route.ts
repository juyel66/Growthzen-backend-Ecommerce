import { Router } from "express";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { getOrderByIdHandler, getOrdersHandler, updateOrderStatusHandler } from "../orders/orders.controller";
import { orderStatusUpdateValidationSchema } from "../orders/orders.validation";
import { approvePaymentHandler, getUnpaidDeliveredOrdersHandler, listPaymentsHandler, markOrderPaymentPaidHandler, refundPaymentHandler, rejectPaymentHandler } from "../payments/payments.controller";
import { refundPaymentValidationSchema, rejectPaymentValidationSchema } from "../payments/payments.validation";

const router = Router();
router.use(authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"));

/**
 * @swagger
 * /admin/orders:
 *   get:
 *     summary: List and search all orders
 *     description: Admin-only paginated order list supporting search and status filtering.
 *     tags: [Admin Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [PENDING, CONFIRMED, PROCESSING, PACKED, SHIPPED, DELIVERED, CANCELLED, RETURNED] } }
 *     responses:
 *       200: { description: Orders retrieved successfully }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/orders", getOrdersHandler);

/**
 * @swagger
 * /admin/orders/{id}:
 *   get:
 *     summary: Get any order details
 *     description: Returns order details to an administrator.
 *     tags: [Admin Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Order retrieved successfully }
 *       404: { description: Order not found }
 */
router.get("/orders/:id", getOrderByIdHandler);

/**
 * @swagger
 * /admin/orders/{id}/status:
 *   patch:
 *     summary: Update an order status
 *     description: Updates an order lifecycle status and records its status history.
 *     tags: [Admin Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/OrderStatusRequest' }
 *           example: { status: "PROCESSING", adminNote: "Payment verified and sent to fulfilment." }
 *     responses:
 *       200: { description: Order status updated successfully }
 *       400: { description: Validation error }
 *       404: { description: Order not found }
 */
router.patch("/orders/:id/status", validateRequest(orderStatusUpdateValidationSchema), updateOrderStatusHandler);

/**
 * @swagger
 * /admin/payments:
 *   get:
 *     summary: List, search and filter payments
 *     description: Admin-only paginated payment ledger. Payments are immutable audit entities and are never hard-deleted.
 *     tags: [Admin Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: method, schema: { type: string, enum: [COD, BKASH, NAGAD] } }
 *       - { in: query, name: status, schema: { type: string, enum: [PENDING, PAID, FAILED, CANCELLED, REFUNDED] } }
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/PaymentListResponse' } } }
 *       400: { description: Invalid filters }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/payments", listPaymentsHandler);

/**
 * @swagger
 * /admin/payments/{paymentId}/approve:
 *   patch:
 *     summary: Approve a pending payment
 *     description: Marks a verified pending payment as paid.
 *     tags: [Admin Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PaymentId'
 *     responses:
 *       200:
 *         description: Payment approved successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/PaymentSuccessResponse' } } }
 *       400: { description: Payment cannot be approved }
 *       404: { description: Payment not found }
 */
router.patch("/payments/:paymentId/approve", approvePaymentHandler);

/**
 * @swagger
 * /admin/payments/{paymentId}/reject:
 *   patch:
 *     summary: Reject a pending payment
 *     description: Marks a pending payment as failed and records an administrator reason.
 *     tags: [Admin Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PaymentId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RejectPaymentRequest' }
 *           example: { reason: "Transaction could not be verified." }
 *     responses:
 *       200:
 *         description: Payment rejected successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/PaymentSuccessResponse' } } }
 *       400: { description: Payment cannot be rejected }
 *       404: { description: Payment not found }
 */
router.patch("/payments/:paymentId/reject", validateRequest(rejectPaymentValidationSchema), rejectPaymentHandler);

/**
 * @swagger
 * /admin/payments/{paymentId}/refund:
 *   patch:
 *     summary: Refund a paid payment
 *     description: Safely replaces deletion by retaining the financial record and marking a paid payment as REFUNDED with an audit reason.
 *     tags: [Admin Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PaymentId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RefundPaymentRequest' }
 *           example: { reason: "Customer return approved and funds transferred." }
 *     responses:
 *       200:
 *         description: Payment refunded successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/PaymentSuccessResponse' } } }
 *       400: { description: Only paid payments can be refunded }
 *       404: { description: Payment not found }
 */
router.patch("/payments/:paymentId/refund", validateRequest(refundPaymentValidationSchema), refundPaymentHandler);

/**
 * @swagger
 * /admin/payments/unpaid-delivered:
 *   get:
 *     summary: List unpaid delivered orders
 *     description: Returns orders that are delivered but payment has not been collected yet.
 *     tags: [Admin Payments]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Unpaid delivered orders retrieved successfully
 */
router.get("/payments/unpaid-delivered", getUnpaidDeliveredOrdersHandler);

/**
 * @swagger
 * /admin/payments/{orderId}/mark-paid:
 *   patch:
 *     summary: Mark payment as paid for an order
 *     description: Sets paymentCollected to true and payment status to PAID inside a transaction.
 *     tags: [Admin Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment marked as paid successfully
 */
router.patch("/payments/:orderId/mark-paid", markOrderPaymentPaidHandler);

export default router;

