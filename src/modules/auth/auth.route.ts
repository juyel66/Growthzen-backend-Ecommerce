import { Router } from "express";
import {
  changePasswordHandler,
  forgotPasswordHandler,
  getMe,
  loginUser,
  logoutUser,
  refreshTokenHandler,
  registerUser,
  resetPasswordHandler,
  verifyOtpHandler,
} from "./auth.controller";
import validateRequest from "../../middlewares/validateRequest";
import { authenticate } from "../../middlewares/auth";
import {
  changePasswordValidationSchema,
  emailOnlyValidationSchema,
  loginValidationSchema,
  refreshTokenValidationSchema,
  registerValidationSchema,
  resetPasswordValidationSchema,
  verifyOtpValidationSchema,
} from "./auth.validation";

const router = Router();


/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register User
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             name: "Md Juyel Rana"
 *             email: "juyel@gmail.com"
 *             password: "12345678"
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post(
  "/register",
  validateRequest(registerValidationSchema),
  registerUser
);



/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login User
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post(
  "/login",
  validateRequest(loginValidationSchema),
  loginUser
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get Current User
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
router.get("/me", authenticate, getMe);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout User
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", authenticate, logoutUser);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Send Password Reset OTP
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post(
  "/forgot-password",
  validateRequest(emailOnlyValidationSchema),
  forgotPasswordHandler
);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: OTP verified successfully
 */
router.post(
  "/verify-otp",
  validateRequest(verifyOtpValidationSchema),
  verifyOtpHandler
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset Password
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post(
  "/reset-password",
  validateRequest(resetPasswordValidationSchema),
  resetPasswordHandler
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh Access Token
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 */
router.post(
  "/refresh-token",
  validateRequest(refreshTokenValidationSchema),
  refreshTokenHandler
);

/**
 * @swagger
 * /auth/change-password:
 *   patch:
 *     summary: Change Password
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.patch(
  "/change-password",
  authenticate,
  validateRequest(changePasswordValidationSchema),
  changePasswordHandler
);

export default router;