import { Router } from "express";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import validateQueryRequest from "../../middlewares/validateQueryRequest";
import {
	getDashboardChartsHandler,
	getDashboardCustomersHandler,
	getDashboardOrdersHandler,
	getDashboardOverviewHandler,
	getDashboardPaymentsHandler,
	getDashboardRecentHandler,
	getDashboardRevenueHandler,
} from "./dashboard.controller";
import { dashboardQueryValidationSchema } from "./dashboard.validation";

const router = Router();

router.use(authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"));

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get the full admin dashboard overview
 *     description: Returns the enterprise dashboard summary with revenue, order, product, customer, payment, coupon, and shipping KPIs.
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, MONTHLY, YEARLY, CUSTOM] }, description: Revenue analytics range }
 *       - { in: query, name: from, schema: { type: string, format: date-time }, description: Required when range is CUSTOM }
 *       - { in: query, name: to, schema: { type: string, format: date-time }, description: Required when range is CUSTOM }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 }, description: Pagination page for recent widgets }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 10 }, description: Pagination limit for recent widgets }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [createdAt, totalAmount, soldQuantity, revenue] }, description: Sort field for recent widgets }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] }, description: Sort order for recent widgets }
 *     responses:
 *       200:
 *         description: Dashboard overview retrieved successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/DashboardOverviewResponse' } } }
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/", validateQueryRequest(dashboardQueryValidationSchema), getDashboardOverviewHandler);

/**
 * @swagger
 * /dashboard/revenue:
 *   get:
 *     summary: Get revenue analytics
 *     description: Returns total, daily, weekly, monthly, yearly, and selected-range revenue. Revenue is calculated only from DELIVERED orders.
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, MONTHLY, YEARLY, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *     responses:
 *       200:
 *         description: Revenue analytics retrieved successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/DashboardRevenueResponse' } } }
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/revenue", validateQueryRequest(dashboardQueryValidationSchema), getDashboardRevenueHandler);

/**
 * @swagger
 * /dashboard/orders:
 *   get:
 *     summary: Get order analytics
 *     description: Returns total orders, status breakdowns, monthly order volumes, payment-method breakdowns, and shipping-method breakdowns.
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Order analytics retrieved successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/DashboardOrdersResponse' } } }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/orders", getDashboardOrdersHandler);

/**
 * @swagger
 * /dashboard/customers:
 *   get:
 *     summary: Get customer analytics
 *     description: Returns the customer base totals and growth data for dashboard widgets and charts.
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Customer analytics retrieved successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/DashboardCustomersResponse' } } }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/customers", getDashboardCustomersHandler);

/**
 * @swagger
 * /dashboard/payments:
 *   get:
 *     summary: Get payment analytics
 *     description: Returns total payments and breakdowns by status and payment method.
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Payment analytics retrieved successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/DashboardPaymentsResponse' } } }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/payments", getDashboardPaymentsHandler);

/**
 * @swagger
 * /dashboard/charts:
 *   get:
 *     summary: Get dashboard charts
 *     description: Returns JSON chart series for revenue, orders, payments, and customer growth.
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, MONTHLY, YEARLY, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *     responses:
 *       200:
 *         description: Dashboard charts retrieved successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/DashboardChartsResponse' } } }
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/charts", validateQueryRequest(dashboardQueryValidationSchema), getDashboardChartsHandler);

/**
 * @swagger
 * /dashboard/recent:
 *   get:
 *     summary: Get recent dashboard records
 *     description: Returns the latest dashboard widgets for orders, customers, payments, and top selling products.
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 10 } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [createdAt, totalAmount, soldQuantity, revenue] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: Recent dashboard records retrieved successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/DashboardRecentResponse' } } }
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/recent", validateQueryRequest(dashboardQueryValidationSchema), getDashboardRecentHandler);

export default router;