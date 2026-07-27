import { Router } from "express";
import { authenticate, authorizeRoles, optionalAuthenticate } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { createShippingHandler, deleteShippingHandler, getShippingHandler, listShippingHandler, updateShippingHandler } from "./shipping.controller";
import { createShippingValidationSchema, updateShippingValidationSchema } from "./shipping.validation";
const router = Router();
/** @swagger
 * /shipping:
 *   get:
 *     summary: Get shipping methods
 *     description: Public users receive active methods; admins receive active and inactive non-deleted methods.
 *     tags: [Shipping]
 *     responses: { 200: { description: Shipping methods retrieved successfully } }
 *   post:
 *     summary: Create a shipping method
 *     description: Admin-only creation of a configurable shipping option.
 *     tags: [Shipping]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ShippingWriteRequest' }
 *           example: { name: "Express Delivery", charge: 150, estimatedDeliveryDays: 1, description: "Next business day delivery", status: "ACTIVE" }
 *     responses: { 201: { description: Shipping method created successfully }, 400: { description: Validation error }, 409: { description: Duplicate name } }
 */
router.get("/", optionalAuthenticate, listShippingHandler);
router.post("/", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), validateRequest(createShippingValidationSchema), createShippingHandler);
/** @swagger
 * /shipping/{id}:
 *   get:
 *     summary: Get a shipping method
 *     tags: [Shipping]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Shipping method retrieved successfully }, 404: { description: Not found } }
 *   patch:
 *     summary: Update a shipping method
 *     tags: [Shipping]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/ShippingPatchRequest' }, example: { charge: 180, status: "ACTIVE" } } } }
 *     responses: { 200: { description: Shipping method updated successfully }, 400: { description: Validation error }, 404: { description: Not found } }
 *   delete:
 *     summary: Soft-delete a shipping method
 *     description: Admin-only soft deletion preserves historical order references.
 *     tags: [Shipping]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Shipping method deleted successfully }, 404: { description: Not found } }
 */
router.get("/:id", optionalAuthenticate, getShippingHandler);
router.patch("/:id", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), validateRequest(updateShippingValidationSchema), updateShippingHandler);
router.delete("/:id", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), deleteShippingHandler);
export default router;
