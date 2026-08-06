import { Router } from "express";
import { authenticate, authorizeRoles, optionalAuthenticate } from "../../middlewares/auth";
import { mapProductUploadToBody, productUpload } from "../../middlewares/upload";
import validateRequest from "../../middlewares/validateRequest";
import {
  createProductHandler,
  deleteProductHandler,
  generateProductIdentifiersHandler,
  getProductByIdHandler,
  getProductsHandler,
  updateProductHandler,
} from "./products.controller";
import {
  createProductValidationSchema,
  replaceProductValidationSchema,
  updateProductValidationSchema,
} from "./products.validation";

const router = Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products with review statistics
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Products retrieved successfully }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ProductResponse' }
 */
router.get("/", optionalAuthenticate, getProductsHandler);

/**
 * @swagger
 * /products/generate-identifiers:
 *   get:
 *     summary: Lightweight endpoint to generate SKU and 13-digit barcode
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: category, schema: { type: string }, description: "Category name" }
 *       - { in: query, name: categoryId, schema: { type: string }, description: "Category ID" }
 *     responses:
 *       200:
 *         description: Identifiers generated successfully
 */
router.get("/generate-identifiers", optionalAuthenticate, generateProductIdentifiersHandler);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a product with review statistics
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/ProductId'
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Product retrieved successfully }
 *                 data: { $ref: '#/components/schemas/ProductResponse' }
 *       404: { description: Product not found }
 */
router.get("/:id", optionalAuthenticate, getProductByIdHandler);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a product
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProductWriteRequest' }
 *           example:
 *             title: Wireless Gaming Mouse
 *             shortDescription: Ergonomic wireless mouse for work and gaming.
 *             description: High precision wireless gaming mouse with a rechargeable battery and programmable controls.
 *             category: Electronics
 *             costPrice: 800
 *             customerSellPrice: 1500
 *             resellerPrice: 1200
 *             salePrice: 1350
 *             discountType: PERCENTAGE
 *             discountValue: 10
 *             taxRate: 5
 *             couponCode: SUMMER10
 *             productCode: MOUSE-001
 *             barcode: "8901234567890"
 *             attributes:
 *               - name: Colour
 *                 values: [Black, White]
 *               - name: Material
 *                 values: [ABS Plastic]
 *             enableSize: true
 *             availableSizes: [S, M, L, XL]
 *             status: ACTIVE
 *             thumbnailImage: /uploads/products/thumbnails/mouse.webp
 *             productImages: [/uploads/products/images/mouse-front.webp, /uploads/products/images/mouse-side.webp]
 *             productVideos: [/uploads/products/videos/mouse-demo.mp4]
 *             isFeatured: true
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Product created successfully }
 *                 data: { $ref: '#/components/schemas/ProductResponse' }
 *       400: { description: Validation failed }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       409: { description: Product code or barcode already exists }
 */
router.post("/", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), productUpload, mapProductUploadToBody, validateRequest(createProductValidationSchema), createProductHandler);

/**
 * @swagger
 * /products/{id}:
 *   patch:
 *     summary: Partially update a product
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/ProductId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProductPatchRequest' }
 *           example:
 *             salePrice: 1299
 *             status: ACTIVE
 *             isFeatured: true
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Product updated successfully }
 *                 data: { $ref: '#/components/schemas/ProductResponse' }
 *       400: { description: Validation failed }
 *       404: { description: Product not found }
 *       409: { description: Product code or barcode already exists }
 */
router.patch("/:id", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), productUpload, mapProductUploadToBody, validateRequest(updateProductValidationSchema), updateProductHandler);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Replace a product
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/ProductId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProductWriteRequest' }
 *           example:
 *             title: Wireless Gaming Mouse
 *             shortDescription: Ergonomic wireless mouse for work and gaming.
 *             description: High precision wireless gaming mouse with a rechargeable battery and programmable controls.
 *             category: Electronics
 *             costPrice: 800
 *             customerSellPrice: 1500
 *             resellerPrice: 1200
 *             salePrice: 1350
 *             discountType: PERCENTAGE
 *             discountValue: 10
 *             taxRate: 5
 *             couponCode: SUMMER10
 *             productCode: MOUSE-001
 *             barcode: "8901234567890"
 *             attributes:
 *               - name: Colour
 *                 values: [Black, White]
 *               - name: Material
 *                 values: [ABS Plastic]
 *             enableSize: true
 *             availableSizes: [S, M, L, XL]
 *             status: ACTIVE
 *             thumbnailImage: /uploads/products/thumbnails/mouse.webp
 *             productImages: [/uploads/products/images/mouse-front.webp, /uploads/products/images/mouse-side.webp]
 *             productVideos: [/uploads/products/videos/mouse-demo.mp4]
 *             isFeatured: true
 *     responses:
 *       200:
 *         description: Product replaced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Product updated successfully }
 *                 data: { $ref: '#/components/schemas/ProductResponse' }
 *       400: { description: Validation failed }
 *       404: { description: Product not found }
 *       409: { description: Product code or barcode already exists }
 */
router.put("/:id", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), productUpload, mapProductUploadToBody, validateRequest(replaceProductValidationSchema), updateProductHandler);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/ProductId'
 *     responses:
 *       200: { description: Product deleted successfully }
 *       404: { description: Product not found }
 */
router.delete("/:id", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), deleteProductHandler);

export default router;
