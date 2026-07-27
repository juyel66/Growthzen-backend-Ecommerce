import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { addCartItemHandler, clearCartHandler, getMyCartHandler, removeCartItemHandler, updateCartItemHandler } from "./cart.controller";
import { addCartItemValidationSchema, updateCartItemValidationSchema } from "./cart.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /cart:
 *   post:
 *     summary: Add a product to my cart
 *     description: Adds an active product using database pricing. Re-adding the same product increments its quantity.
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AddCartItemRequest' }
 *           example: { productId: "cmproduct123", quantity: 2 }
 *     responses:
 *       201:
 *         description: Product added to cart successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CartSuccessResponse' }
 *       400: { description: Invalid quantity or product is not active/available }
 *       401: { description: Authentication required }
 *       404: { description: Product not found }
 *   get:
 *     summary: Get my cart
 *     description: Returns only the authenticated user's cart with prices recalculated from current product data.
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CartSuccessResponse' }
 *       401: { description: Authentication required }
 *   delete:
 *     summary: Clear my cart
 *     description: Removes every item only from the authenticated user's cart.
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CartSuccessResponse' }
 *       401: { description: Authentication required }
 */
router.post("/", validateRequest(addCartItemValidationSchema), addCartItemHandler);
router.get("/", getMyCartHandler);
router.delete("/", clearCartHandler);

/**
 * @swagger
 * /cart/{itemId}:
 *   patch:
 *     summary: Update a cart item quantity
 *     description: Replaces the quantity of an item belonging to the authenticated user's cart.
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/CartItemId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateCartItemRequest' }
 *           example: { quantity: 5 }
 *     responses:
 *       200:
 *         description: Cart item quantity updated successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CartSuccessResponse' }
 *       400: { description: Invalid quantity }
 *       401: { description: Authentication required }
 *       404: { description: Cart item not found }
 *   delete:
 *     summary: Remove one item from my cart
 *     description: Removes only the specified item owned by the authenticated user.
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/CartItemId'
 *     responses:
 *       200:
 *         description: Cart item removed successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CartSuccessResponse' }
 *       401: { description: Authentication required }
 *       404: { description: Cart item not found }
 */
router.patch("/:itemId", validateRequest(updateCartItemValidationSchema), updateCartItemHandler);
router.delete("/:itemId", removeCartItemHandler);

export default router;
