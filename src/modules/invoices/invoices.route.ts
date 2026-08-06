import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { getAllInvoicesHandler, getInvoiceHandler, getPublicInvoiceHandler } from "./invoices.controller";

const router = Router();

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: Get all invoices with pagination, filtering, and summary statistics
 *     tags: [Invoices]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Invoices retrieved successfully }
 */
router.get("/", authenticate, getAllInvoicesHandler);

/**
 * @swagger
 * /invoices/{orderId}:
 *   get:
 *     summary: Print order invoice details (DELIVERED orders only)
 *     tags: [Invoices]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: orderId, required: true, schema: { type: string }, description: "Order ID or order code" }
 *     responses:
 *       200: { description: Invoice retrieved successfully }
 *       400: { description: Order is not eligible for invoice }
 *       404: { description: Order not found }
 */
router.get("/:orderId", authenticate, getInvoiceHandler);

export const publicInvoiceRouter = Router();

/**
 * @swagger
 * /public/invoice/{verificationToken}:
 *   get:
 *     summary: Public Invoice Verification API (No Auth Required)
 *     tags: [Invoices]
 *     parameters:
 *       - { in: path, name: verificationToken, required: true, schema: { type: string }, description: "Invoice Verification Token" }
 *     responses:
 *       200: { description: Invoice verification data retrieved successfully }
 *       404: { description: Invoice not found or invalid verification token }
 */
publicInvoiceRouter.get("/invoice/:verificationToken", getPublicInvoiceHandler);

export default router;
