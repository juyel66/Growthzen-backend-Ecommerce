import { Router } from "express";
import { authenticate, authorizeRoles, optionalAuthenticate } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import {
  createOrderHandler,
  getMyOrdersHandler,
  getOrderByIdHandler,
  getOrdersHandler,
  updateOrderStatusHandler,
  trackOrderHandler,
  cancelMyOrderHandler,
} from "./orders.controller";
import { createOrderValidationSchema, orderStatusUpdateValidationSchema } from "./orders.validation";

const router = Router();

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create an order
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [products, customerName, customerPhone, deliveryArea, address]
 *             properties:
 *               products:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   additionalProperties: false
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId: { type: string, minLength: 1 }
 *                     quantity: { type: integer, minimum: 1 }
 *                     size: { type: string, nullable: true }
 *               customerName: { type: string, minLength: 1 }
 *               customerPhone: { type: string, minLength: 1 }
 *               deliveryArea: { type: string, enum: [INSIDE_DHAKA, OUTSIDE_DHAKA] }
 *               address: { type: string, minLength: 1 }
 *               couponCode: { type: string, nullable: true }
 *           example:
 *             products:
 *               - productId: "product-id-123"
 *                 quantity: 2
 *                 size: "XL"
 *             customerName: "Md Juyel Rana"
 *             customerPhone: "01700000000"
 *             deliveryArea: "INSIDE_DHAKA"
 *             address: "Dhaka, Bangladesh"
 *             couponCode: "WINTER25"
 *     responses:
 *       201:
 *         description: Order created successfully
 */
router.post("/", optionalAuthenticate, validateRequest(createOrderValidationSchema), createOrderHandler);

/**
 * @swagger
 * /orders/my-orders:
 *   get:
 *     summary: Get my order history
 *     description: Returns only orders owned by the authenticated user, newest first.
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Orders retrieved successfully }
 *       401: { description: Authentication required }
 */
router.get("/my-orders", authenticate, authorizeRoles("CUSTOMER", "RESELLER", "ADMIN", "SUPER_ADMIN"), getMyOrdersHandler);
router.get("/", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), getOrdersHandler);
router.get("/track/:orderCode", trackOrderHandler);
/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get my order details
 *     description: Customers can access only their own order; administrators can access any order.
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string }, description: "Order ID or order number" }
 *     responses:
 *       200: { description: Order retrieved successfully }
 *       401: { description: Authentication required }
 *       403: { description: Order belongs to another user }
 *       404: { description: Order not found }
 */
router.get("/:id", authenticate, getOrderByIdHandler);

/**
 * @swagger
 * /orders/{orderId}/cancel:
 *   patch:
 *     summary: Cancel my pending order
 *     description: Cancels only an order owned by the authenticated user and only while its status is PENDING. A pending payment is cancelled in the same transaction.
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/OrderId'
 *     responses:
 *       200: { description: Order cancelled successfully }
 *       400: { description: Only pending orders can be cancelled }
 *       401: { description: Authentication required }
 *       404: { description: Order not found }
 */
router.patch("/:orderId/cancel", authenticate, cancelMyOrderHandler);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID or Order Code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             status: "CONFIRMED"
 *             adminNote: "Customer confirmed via phone call."
 *     responses:
 *       200:
 *         description: Order status updated successfully
 */
router.patch("/:id/status", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), validateRequest(orderStatusUpdateValidationSchema), updateOrderStatusHandler);

export default router;
