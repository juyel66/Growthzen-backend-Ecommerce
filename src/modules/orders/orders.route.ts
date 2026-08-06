import { Router } from "express";
import { authenticate, authorizeRoles, optionalAuthenticate } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import {
  createOrderHandler,
  getMyOrdersHandler,
  getOrderByIdHandler,
  getOrderInvoiceHandler,
  getOrdersHandler,
  getOrderSummaryHandler,
  updateOrderStatusHandler,
  trackOrderHandler,
  cancelOrderHandler,
  cancelMyOrderHandler,
} from "./orders.controller";
import { createOrderValidationSchema, orderStatusUpdateValidationSchema } from "./orders.validation";

const router = Router();

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create an order (Supports both Authenticated and Guest Checkout)
 *     description: Create an order. Authentication is OPTIONAL. Mobile phone number is REQUIRED. Email is optional.
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
 *             required: [products, deliveryArea]
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
 *               customerName: { type: string }
 *               customerPhone: { type: string }
 *               customerEmail: { type: string, nullable: true }
 *               userEmail: { type: string, nullable: true }
 *               paymentMethod: { type: string, enum: [COD, BKASH, NAGAD, SSLCOMMERZ, STRIPE, PAYPAL], default: COD }
 *               guestName: { type: string, nullable: true }
 *               guestPhone: { type: string, nullable: true }
 *               guestEmail: { type: string, nullable: true }
 *               guestAddress: { type: string, nullable: true }
 *               guestDivision: { type: string, nullable: true }
 *               guestDistrict: { type: string, nullable: true }
 *               guestUpazila: { type: string, nullable: true }
 *               shippingType: { type: string, nullable: true }
 *               orderNotes: { type: string, nullable: true }
 *               deliveryArea: { type: string, enum: [INSIDE_DHAKA, OUTSIDE_DHAKA] }
 *               address: { type: string }
 *               couponCode: { type: string, nullable: true }
 *           example:
 *             products:
 *               - productId: "product-id-123"
 *                 quantity: 2
 *                 size: "XL"
 *             guestName: "Md Juyel Rana"
 *             guestPhone: "01700000000"
 *             guestEmail: "juyel@example.com"
 *             guestAddress: "House 12, Road 5, Block B"
 *             guestDivision: "Dhaka"
 *             guestDistrict: "Dhaka"
 *             guestUpazila: "Dhanmondi"
 *             shippingType: "Standard Delivery"
 *             orderNotes: "Please deliver before 5 PM"
 *             deliveryArea: "INSIDE_DHAKA"
 *             couponCode: "WINTER25"
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Missing required phone number or invalid product input
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

/**
 * @swagger
 * /orders/track/{orderCode}:
 *   get:
 *     summary: Track order status
 *     description: Retrieve tracking details for an order using Order Code / ID and optional Phone Number.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderCode
 *         required: true
 *         schema: { type: string }
 *         description: Order Code or Order ID
 *       - in: query
 *         name: phone
 *         required: false
 *         schema: { type: string }
 *         description: Customer phone number for verification
 *     responses:
 *       200: { description: Order tracking details retrieved successfully }
 *       404: { description: Order not found or phone number does not match }
 */
router.get("/track/:orderCode", trackOrderHandler);
/**
 * @swagger
 * /orders/summary:
 *   get:
 *     summary: Get Order Summary statistics (unpaginated database aggregation)
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: from, schema: { type: string }, description: "Start date filter" }
 *       - { in: query, name: to, schema: { type: string }, description: "End date filter" }
 *       - { in: query, name: status, schema: { type: string }, description: "Order status filter" }
 *     responses:
 *       200: { description: Order summary retrieved successfully }
 */
router.get("/summary", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), getOrderSummaryHandler);

/**
 * @swagger
 * /orders/{id}/invoice:
 *   get:
 *     summary: Get order print invoice details (DELIVERED orders only)
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string }, description: "Order ID or order code" }
 *     responses:
 *       200: { description: Invoice retrieved successfully }
 *       400: { description: Order is not eligible for invoice }
 *       404: { description: Order not found }
 */
router.get("/:id/invoice", authenticate, getOrderInvoiceHandler);

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
router.patch("/:id/cancel", authenticate, cancelOrderHandler);

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
