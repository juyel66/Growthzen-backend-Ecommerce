import { Router } from "express";
import { authenticate, authorizeRoles, optionalAuthenticate } from "../../middlewares/auth";
import { reviewUpload, mapReviewUploadToBody } from "../../middlewares/upload";
import validateRequest from "../../middlewares/validateRequest";
import * as controller from "./reviews.controller";
import { createReviewSchema } from "./reviews.validation";
import type { Role } from "@prisma/client";

const router = Router();

/**
 * @openapi
 * /reviews:
 *   post:
 *     tags:
 *       - review
 *     summary: Submit a product review (delivered orders only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - orderItemId
 *               - rating
 *             properties:
 *               orderItemId:
 *                 type: string
 *                 description: Delivered order item id. User can review each order item only once.
 *                 example: "cl0x..."
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating value from 1 to 5.
 *                 example: 5
 *               comment:
 *                 type: string
 *                 nullable: true
 *                 description: Optional review comment.
 *                 example: "Great product!"
 *               reviewImages:
 *                 type: array
 *                 description: Optional review images. Upload up to 10 image files.
 *                 items:
 *                   type: string
 *                   format: binary
 *           encoding:
 *             reviewImages:
 *               style: form
 *               explode: true
 *           examples:
 *             createReview:
 *               summary: Review create form-data
 *               value:
 *                 orderItemId: "cl0x..."
 *                 rating: 5
 *                 comment: "Great product!"
 *     responses:
 *       '200':
 *         description: Review submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Review'
 */
router.post("/", authenticate, reviewUpload, mapReviewUploadToBody, validateRequest(createReviewSchema), controller.createReviewHandler);

/**
 * @openapi
 * /reviews/product/{productId}:
 *   get:
 *     tags:
 *       - review
 *     summary: Get public reviews and stats for a product
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         example: "cl0x..."
 *     responses:
 *       '200':
 *         description: Product reviews and stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     averageRating:
 *                       type: number
 *                     ratingCount:
 *                       type: integer
 *                     fiveStar:
 *                       type: integer
 *                     fourStar:
 *                       type: integer
 *                     threeStar:
 *                       type: integer
 *                     twoStar:
 *                       type: integer
 *                     oneStar:
 *                       type: integer
 *                     reviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PublicReview'
 */
router.get("/product/:productId", optionalAuthenticate, controller.getProductReviewsHandler);

/**
 * @openapi
 * /reviews/my:
 *   get:
 *     tags:
 *       - review
 *     summary: Get reviews submitted by the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: My reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminReviewView'
 */
router.get("/my", authenticate, controller.getMyReviewsHandler);

/** Admin routes */
/**
 * @openapi
 * /reviews:
 *   get:
 *     tags:
 *       - review
 *     summary: Admin - list all reviews
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: All reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminReviewView'
 */
router.get("/", authenticate, authorizeRoles("ADMIN" as Role, "SUPER_ADMIN" as Role), controller.adminListReviewsHandler);

/**
 * @openapi
 * /reviews/{id}:
 *   patch:
 *     tags:
 *       - review
 *     summary: Admin - update a review (rating/comment/images/status)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               comment:
 *                 type: string
 *                 nullable: true
 *                 example: "Updated review comment"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "/uploads/products/reviews/1710000000000-123456789.jpg"
 *               status:
 *                 type: string
 *                 enum: [APPROVED, HIDDEN]
 *                 example: "APPROVED"
 *           examples:
 *             updateRatingComment:
 *               summary: Update rating and comment
 *               value:
 *                 rating: 4
 *                 comment: "Updated review comment"
 *             updateImages:
 *               summary: Replace review images
 *               value:
 *                 images:
 *                   - "/uploads/products/reviews/1710000000000-123456789.jpg"
 *                   - "/uploads/products/reviews/1710000000000-987654321.jpg"
 *             updateStatus:
 *               summary: Hide or approve review
 *               value:
 *                 status: "HIDDEN"
 *     responses:
 *       '200':
 *         description: Review updated
 */
router.patch("/:id", authenticate, authorizeRoles("ADMIN" as Role, "SUPER_ADMIN" as Role), controller.updateReviewHandler);

/**
 * @openapi
 * /reviews/{id}:
 *   delete:
 *     tags:
 *       - review
 *     summary: Admin - delete a review
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Review deleted
 */
router.delete("/:id", authenticate, authorizeRoles("ADMIN" as Role, "SUPER_ADMIN" as Role), controller.deleteReviewHandler);

/**
 * @openapi
 * /reviews/form/{orderItemId}:
 *   get:
 *     tags:
 *       - review
 *     summary: Get autofill data for review form for an order item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderItemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Review form data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     orderCode:
 *                       type: string
 *                     productId:
 *                       type: string
 *                     productName:
 *                       type: string
 *                     productImage:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     userEmail:
 *                       type: string
 *                     rating:
 *                       type: integer
 *                     comment:
 *                       type: string
 *                     previousReview:
 *                       $ref: '#/components/schemas/Review'
 */
router.get("/form/:orderItemId", authenticate, controller.getReviewFormHandler);

export default router;
