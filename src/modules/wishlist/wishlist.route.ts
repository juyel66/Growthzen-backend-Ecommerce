import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { addWishlistItemHandler, clearWishlistHandler, getMyWishlistHandler, removeWishlistItemHandler } from "./wishlist.controller";
import { addWishlistItemValidationSchema } from "./wishlist.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /wishlist:
 *   post:
 *     summary: Add a product to my wishlist
 *     description: Adds an active product without duplicates. Cart membership is unaffected.
 *     tags: [Wishlist]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AddWishlistItemRequest' }
 *           example: { productId: "cmproduct123" }
 *     responses:
 *       201:
 *         description: Product added to wishlist successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/WishlistSuccessResponse' }
 *       200:
 *         description: Product already exists in wishlist
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/WishlistSuccessResponse' }
 *       400: { description: Product is not active }
 *       401: { description: Authentication required }
 *       404: { description: Product not found }
 *   get:
 *     summary: Get my wishlist
 *     description: Returns only the authenticated user's wishlist.
 *     tags: [Wishlist]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Wishlist retrieved successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/WishlistSuccessResponse' }
 *       401: { description: Authentication required }
 *   delete:
 *     summary: Clear my wishlist
 *     description: Removes all wishlist items without changing the cart.
 *     tags: [Wishlist]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Wishlist cleared successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/WishlistSuccessResponse' }
 *       401: { description: Authentication required }
 */
router.post("/", validateRequest(addWishlistItemValidationSchema), addWishlistItemHandler);
router.get("/", getMyWishlistHandler);
router.delete("/", clearWishlistHandler);

/**
 * @swagger
 * /wishlist/{itemId}:
 *   delete:
 *     summary: Remove one item from my wishlist
 *     description: Removes only the specified wishlist item owned by the authenticated user; cart data is unchanged.
 *     tags: [Wishlist]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/WishlistItemId'
 *     responses:
 *       200:
 *         description: Wishlist item removed successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/WishlistSuccessResponse' }
 *       401: { description: Authentication required }
 *       404: { description: Wishlist item not found }
 */
router.delete("/:itemId", removeWishlistItemHandler);

export default router;
