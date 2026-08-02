import { Router } from "express";
import { authenticate, authorizeRoles, optionalAuthenticate } from "../../middlewares/auth";
import validateQueryRequest from "../../middlewares/validateQueryRequest";
import {
  createCategoryHandler,
  deleteCategoryHandler,
  getCategoriesHandler,
  getCategoryByIdHandler,
  updateCategoryHandler,
} from "./category.controller";
import { categoryQueryValidationSchema } from "./category.validation";

const router = Router();

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a new category
 *     description: Creates a new category. Only accessible by ADMIN and SUPER_ADMIN.
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Electronics" }
 *               slug: { type: string, example: "electronics" }
 *               description: { type: string, example: "Electronic gadgets and accessories" }
 *               image: { type: string, example: "/uploads/categories/electronics.png" }
 *               parentCategoryId: { type: string, nullable: true }
 *               discountPercentage: { type: number, example: 10 }
 *               discountEnabled: { type: boolean, example: true }
 *               sortOrder: { type: integer, example: 1 }
 *               showOnHomepage: { type: boolean, example: true }
 *               status: { type: string, enum: [ACTIVE, INACTIVE], example: "ACTIVE" }
 *               metaTitle: { type: string, example: "Electronics - Buy online" }
 *               metaDescription: { type: string, example: "Shop top electronic products" }
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 *       409: { description: Duplicate category name or slug }
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  createCategoryHandler
);

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all categories
 *     description: Returns paginated list of categories. Public users receive ACTIVE categories only; Admins may filter by status or view all.
 *     tags: [Categories]
 *     security: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 }, description: Page number }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 }, description: Items per page }
 *       - { in: query, name: search, schema: { type: string }, description: Search by name, slug, or description }
 *       - { in: query, name: status, schema: { type: string, enum: [ACTIVE, INACTIVE] }, description: Filter by status (Admin only) }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [name, createdAt, sortOrder, discountPercentage] }, description: Sort field }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] }, description: Sort direction }
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       400: { description: Validation error }
 */
router.get(
  "/",
  optionalAuthenticate,
  validateQueryRequest(categoryQueryValidationSchema),
  getCategoriesHandler
);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     description: Returns category details including parent category and subcategories.
 *     tags: [Categories]
 *     security: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string }, description: Category ID }
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404: { description: Category not found }
 */
router.get("/:id", optionalAuthenticate, getCategoryByIdHandler);

/**
 * @swagger
 * /categories/{id}:
 *   patch:
 *     summary: Update a category
 *     description: Updates category details and default discounts. Only accessible by ADMIN and SUPER_ADMIN.
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               description: { type: string, nullable: true }
 *               image: { type: string, nullable: true }
 *               parentCategoryId: { type: string, nullable: true }
 *               discountPercentage: { type: number }
 *               discountEnabled: { type: boolean }
 *               sortOrder: { type: integer }
 *               showOnHomepage: { type: boolean }
 *               status: { type: string, enum: [ACTIVE, INACTIVE] }
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 *       404: { description: Category not found }
 */
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  updateCategoryHandler
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Soft delete a category
 *     description: Soft deletes a category if no products belong to it. If products belong to it, returns a 400 validation error suggesting deactivation.
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400: { description: Cannot delete category with associated products }
 *       401: { description: Authentication required }
 *       403: { description: Admin access required }
 *       404: { description: Category not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  deleteCategoryHandler
);

export default router;
