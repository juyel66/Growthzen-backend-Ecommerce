import { Router } from "express";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { changeUserRole, getUserDetails, listUsers, removeUser } from "./users.controller";
import { updateUserRoleValidationSchema } from "./users.validation";

const router = Router();

router.use(authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"));

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserListItem'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only ADMIN and SUPER_ADMIN can access
 */
router.get("/", listUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/UserListItem'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only ADMIN and SUPER_ADMIN can access
 *       404:
 *         description: User not found
 */
router.get("/:id", getUserDetails);

/**
 * @swagger
 * /users/{id}/role:
 *   patch:
 *     summary: Change User Role
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: ["SUPER_ADMIN", "ADMIN", "RESELLER", "CUSTOMER"]
 *                 example: "ADMIN"
 *                 description: New role for the user
 *           example:
 *             role: "ADMIN"
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User role updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/UserListItem'
 *       400:
 *         description: Invalid role provided
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: User not found
 */
router.patch("/:id/role", validateRequest(updateUserRoleValidationSchema), changeUserRole);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *       400:
 *         description: User ID is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Cannot delete own account or insufficient permissions
 *       404:
 *         description: User not found
 */
router.delete("/:id", removeUser);

export default router;