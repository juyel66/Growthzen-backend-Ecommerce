import {Router} from "express"; import {authenticate,authorizeRoles} from "../../middlewares/auth"; import validateRequest from "../../middlewares/validateRequest";
import {applyCouponHandler,createCouponHandler,deleteCouponHandler,getCouponHandler,listCouponsHandler,removeCouponHandler,updateCouponHandler} from "./coupons.controller";
import {applyCouponValidationSchema,createCouponValidationSchema,removeCouponValidationSchema,updateCouponValidationSchema} from "./coupons.validation";
const router=Router(); router.use(authenticate);
/** @swagger
 * /coupons/apply:
 *   post:
 *     summary: Apply a coupon to my cart
 *     description: Validates dates, limits, minimum amount and scope using current database prices.
 *     tags: [Coupons]
 *     security: [{ bearerAuth: [] }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object, additionalProperties: false, required: [code], properties: { code: { type: string } } }, example: { code: "SUMMER20" } } } }
 *     responses: { 200: { description: Coupon applied successfully }, 400: { description: Coupon rule failed }, 404: { description: Coupon not found } }
 */
router.post("/apply",validateRequest(applyCouponValidationSchema),applyCouponHandler);
/** @swagger
 * /coupons/remove:
 *   post:
 *     summary: Remove the coupon from my cart
 *     tags: [Coupons]
 *     security: [{ bearerAuth: [] }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object, additionalProperties: false }, example: {} } } }
 *     responses: { 200: { description: Coupon removed successfully }, 404: { description: Cart not found } }
 */
router.post("/remove",validateRequest(removeCouponValidationSchema),removeCouponHandler);
/** @swagger
 * /coupons:
 *   get:
 *     summary: List all non-deleted coupons
 *     tags: [Coupons]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Coupons retrieved successfully }, 403: { description: Admin access required } }
 *   post:
 *     summary: Create a coupon
 *     tags: [Coupons]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CouponWriteRequest' }
 *           example: { code: "SUMMER20", description: "20 percent on selected fashion", discountType: "PERCENTAGE", discountValue: 20, scope: "SPECIFIC_CATEGORY", productIds: [], categories: ["Fashion"], startsAt: "2026-07-28T00:00:00.000Z", expiresAt: "2026-08-31T23:59:59.000Z", maximumUsage: 500, perUserUsageLimit: 1, minimumOrderAmount: 1000, maximumDiscount: 500, isActive: true }
 *     responses: { 201: { description: Coupon created successfully }, 400: { description: Validation error }, 409: { description: Duplicate code } }
 */
router.get("/",authorizeRoles("ADMIN","SUPER_ADMIN"),listCouponsHandler); router.post("/",authorizeRoles("ADMIN","SUPER_ADMIN"),validateRequest(createCouponValidationSchema),createCouponHandler);
/** @swagger
 * /coupons/{id}:
 *   get:
 *     summary: Get a coupon by ID
 *     tags: [Coupons]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Coupon retrieved successfully }, 404: { description: Coupon not found } }
 *   patch:
 *     summary: Update a coupon
 *     tags: [Coupons]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/CouponPatchRequest' }, example: { maximumUsage: 750, isActive: true } } } }
 *     responses: { 200: { description: Coupon updated successfully }, 400: { description: Validation error }, 404: { description: Coupon not found } }
 *   delete:
 *     summary: Soft-delete a coupon
 *     description: Preserves order and usage audit records while preventing future application.
 *     tags: [Coupons]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Coupon deleted successfully }, 404: { description: Coupon not found } }
 */
router.get("/:id",authorizeRoles("ADMIN","SUPER_ADMIN"),getCouponHandler); router.patch("/:id",authorizeRoles("ADMIN","SUPER_ADMIN"),validateRequest(updateCouponValidationSchema),updateCouponHandler); router.delete("/:id",authorizeRoles("ADMIN","SUPER_ADMIN"),deleteCouponHandler);
export default router;
