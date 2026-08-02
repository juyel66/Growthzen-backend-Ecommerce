import { Router } from "express";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import validateQueryRequest from "../../middlewares/validateQueryRequest";
import {
  exportCouponReportHandler,
  exportCustomerReportHandler,
  exportOrderReportHandler,
  exportPaymentReportHandler,
  exportProductReportHandler,
  exportRevenueReportHandler,
  exportSalesReportHandler,
  exportShippingReportHandler,
  getCouponReportHandler,
  getCustomerReportHandler,
  getOrderReportHandler,
  getPaymentReportHandler,
  getProductReportHandler,
  getRevenueReportHandler,
  getSalesReportHandler,
  getShippingReportHandler,
} from "./reports.controller";
import { reportsQueryValidationSchema } from "./reports.validation";

const router = Router();

router.use(authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"));

/**
 * @swagger
 * /reports/sales:
 *   get:
 *     summary: Get Sales Report
 *     description: Returns enterprise sales analytics including total sales, delivered orders, total revenue, average order value, top selling products, lowest selling products, and paginated transaction items. Revenue is strictly calculated ONLY from DELIVERED orders.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 }, description: Page number }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 }, description: Items per page }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] }, description: Predefined date range }
 *       - { in: query, name: from, schema: { type: string, format: date-time }, description: Start date ISO string (Required if range is CUSTOM) }
 *       - { in: query, name: to, schema: { type: string, format: date-time }, description: End date ISO string (Required if range is CUSTOM) }
 *       - { in: query, name: search, schema: { type: string }, description: Search by order code, customer name/email, product title/code }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [revenue, date, orders, products, customers, createdAt] }, description: Sort field }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] }, description: Sort direction }
 *     responses:
 *       200:
 *         description: Report generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Sales report generated successfully." }
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalSales: { type: integer, example: 120 }
 *                         deliveredOrders: { type: integer, example: 120 }
 *                         totalRevenue: { type: number, example: 180000 }
 *                         averageOrderValue: { type: number, example: 1500 }
 *                         topSellingProducts: { type: array, items: { type: object } }
 *                         lowestSellingProducts: { type: array, items: { type: object } }
 *                     items: { type: array, items: { type: object } }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer, example: 1 }
 *                     limit: { type: integer, example: 10 }
 *                     total: { type: integer, example: 120 }
 *                     totalPages: { type: integer, example: 12 }
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/sales", validateQueryRequest(reportsQueryValidationSchema), getSalesReportHandler);

/**
 * @swagger
 * /reports/sales/export:
 *   get:
 *     summary: Export Sales Report
 *     description: Downloads the filtered sales report in CSV, Excel (.xlsx), or PDF format matching applied search, date range, and sort parameters.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: format, required: true, schema: { type: string, enum: [csv, xlsx, pdf] }, description: Export file format }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [revenue, date, orders, products, customers, createdAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: File attachment stream (CSV, XLSX, or PDF)
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/sales/export", validateQueryRequest(reportsQueryValidationSchema), exportSalesReportHandler);

/**
 * @swagger
 * /reports/revenue:
 *   get:
 *     summary: Get Revenue Report
 *     description: Returns revenue breakdown (Today, Yesterday, Weekly, Monthly, Yearly, Custom range) and transaction items. Strictly restricted to DELIVERED orders only.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [revenue, date, createdAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: Report generated successfully.
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/revenue", validateQueryRequest(reportsQueryValidationSchema), getRevenueReportHandler);

/**
 * @swagger
 * /reports/revenue/export:
 *   get:
 *     summary: Export Revenue Report
 *     description: Downloads the filtered revenue report in CSV, Excel (.xlsx), or PDF format.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: format, required: true, schema: { type: string, enum: [csv, xlsx, pdf] } }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [revenue, date, createdAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: File attachment stream (CSV, XLSX, or PDF)
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/revenue/export", validateQueryRequest(reportsQueryValidationSchema), exportRevenueReportHandler);

/**
 * @swagger
 * /reports/orders:
 *   get:
 *     summary: Get Order Report
 *     description: Returns order status breakdowns (Pending, Confirmed, Processing, Packed, Shipped, Delivered, Cancelled, Returned) and paginated list of orders. Supports status filtering.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: status, schema: { type: string, enum: [PENDING, CONFIRMED, PROCESSING, PACKED, SHIPPED, DELIVERED, CANCELLED, RETURNED] }, description: Filter by order status }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [revenue, date, createdAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: Report generated successfully.
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/orders", validateQueryRequest(reportsQueryValidationSchema), getOrderReportHandler);

/**
 * @swagger
 * /reports/orders/export:
 *   get:
 *     summary: Export Order Report
 *     description: Downloads the filtered order report in CSV, Excel (.xlsx), or PDF format.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: format, required: true, schema: { type: string, enum: [csv, xlsx, pdf] } }
 *       - { in: query, name: status, schema: { type: string, enum: [PENDING, CONFIRMED, PROCESSING, PACKED, SHIPPED, DELIVERED, CANCELLED, RETURNED] } }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [revenue, date, createdAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: File attachment stream (CSV, XLSX, or PDF)
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/orders/export", validateQueryRequest(reportsQueryValidationSchema), exportOrderReportHandler);

/**
 * @swagger
 * /reports/products:
 *   get:
 *     summary: Get Product Report
 *     description: Returns product metrics (Total, Active, Inactive, Featured, Best Selling, Lowest Selling) and performance analytics per product.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: status, schema: { type: string, enum: [DRAFT, ACTIVE, INACTIVE, ARCHIVED] } }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [revenue, orders, products, date, createdAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: Report generated successfully.
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/products", validateQueryRequest(reportsQueryValidationSchema), getProductReportHandler);

/**
 * @swagger
 * /reports/products/export:
 *   get:
 *     summary: Export Product Report
 *     description: Downloads the filtered product report in CSV, Excel (.xlsx), or PDF format.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: format, required: true, schema: { type: string, enum: [csv, xlsx, pdf] } }
 *       - { in: query, name: status, schema: { type: string, enum: [DRAFT, ACTIVE, INACTIVE, ARCHIVED] } }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [revenue, orders, products, date, createdAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: File attachment stream (CSV, XLSX, or PDF)
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/products/export", validateQueryRequest(reportsQueryValidationSchema), exportProductReportHandler);

/**
 * @swagger
 * /reports/customers:
 *   get:
 *     summary: Get Customer Report
 *     description: Returns customer metrics (Total, New, Active, Top/Highest Spending) and purchase history per customer.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [revenue, orders, customers, date, createdAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: Report generated successfully.
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/customers", validateQueryRequest(reportsQueryValidationSchema), getCustomerReportHandler);

/**
 * @swagger
 * /reports/customers/export:
 *   get:
 *     summary: Export Customer Report
 *     description: Downloads the filtered customer report in CSV, Excel (.xlsx), or PDF format.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: format, required: true, schema: { type: string, enum: [csv, xlsx, pdf] } }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [revenue, orders, customers, date, createdAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: File attachment stream (CSV, XLSX, or PDF)
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/customers/export", validateQueryRequest(reportsQueryValidationSchema), exportCustomerReportHandler);

/**
 * @swagger
 * /reports/payments:
 *   get:
 *     summary: Get Payment Report
 *     description: Returns payment summary metrics (Total, Paid, Pending, Failed, Refunded) and paginated payment records. Supports filtering by payment method and status.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: paymentMethod, schema: { type: string, enum: [COD, BKASH, NAGAD] } }
 *       - { in: query, name: status, schema: { type: string, enum: [PENDING, PAID, FAILED, CANCELLED, REFUNDED] } }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [revenue, date, createdAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: Report generated successfully.
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/payments", validateQueryRequest(reportsQueryValidationSchema), getPaymentReportHandler);

/**
 * @swagger
 * /reports/payments/export:
 *   get:
 *     summary: Export Payment Report
 *     description: Downloads the filtered payment report in CSV, Excel (.xlsx), or PDF format.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: format, required: true, schema: { type: string, enum: [csv, xlsx, pdf] } }
 *       - { in: query, name: paymentMethod, schema: { type: string, enum: [COD, BKASH, NAGAD] } }
 *       - { in: query, name: status, schema: { type: string, enum: [PENDING, PAID, FAILED, CANCELLED, REFUNDED] } }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [revenue, date, createdAt] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: File attachment stream (CSV, XLSX, or PDF)
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/payments/export", validateQueryRequest(reportsQueryValidationSchema), exportPaymentReportHandler);

/**
 * @swagger
 * /reports/shipping:
 *   get:
 *     summary: Get Shipping Report
 *     description: Returns shipping methods metrics, orders per shipping method, delivered shipments count, and returned shipments count.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Report generated successfully.
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/shipping", validateQueryRequest(reportsQueryValidationSchema), getShippingReportHandler);

/**
 * @swagger
 * /reports/shipping/export:
 *   get:
 *     summary: Export Shipping Report
 *     description: Downloads the filtered shipping report in CSV, Excel (.xlsx), or PDF format.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: format, required: true, schema: { type: string, enum: [csv, xlsx, pdf] } }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200:
 *         description: File attachment stream (CSV, XLSX, or PDF)
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/shipping/export", validateQueryRequest(reportsQueryValidationSchema), exportShippingReportHandler);

/**
 * @swagger
 * /reports/coupons:
 *   get:
 *     summary: Get Coupon Report
 *     description: Returns coupon metrics (Total, Active, Expired, Usage count, Total discount given) and usage performance per coupon.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Report generated successfully.
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/coupons", validateQueryRequest(reportsQueryValidationSchema), getCouponReportHandler);

/**
 * @swagger
 * /reports/coupons/export:
 *   get:
 *     summary: Export Coupon Report
 *     description: Downloads the filtered coupon report in CSV, Excel (.xlsx), or PDF format.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: format, required: true, schema: { type: string, enum: [csv, xlsx, pdf] } }
 *       - { in: query, name: range, schema: { type: string, enum: [TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, THIS_YEAR, CUSTOM] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200:
 *         description: File attachment stream (CSV, XLSX, or PDF)
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 */
router.get("/coupons/export", validateQueryRequest(reportsQueryValidationSchema), exportCouponReportHandler);

export default router;
