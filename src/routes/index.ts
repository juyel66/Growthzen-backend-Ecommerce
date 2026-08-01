import { Router } from "express";
import authRoutes from "../modules/auth/auth.route";
import dashboardRoutes from "../modules/dashboardManagement/dashboard.route";
import orderRoutes from "../modules/orders/orders.route";
import settingsRoutes from "../modules/settings/settings.route";
import userRoutes from "../modules/users/users.route";
import productRoutes from "../modules/products/products.route";
import reviewRoutes from "../modules/reviews/reviews.route";
import cartRoutes from "../modules/cart/cart.route";
import wishlistRoutes from "../modules/wishlist/wishlist.route";
import checkoutRoutes from "../modules/checkout/checkout.route";
import paymentRoutes from "../modules/payments/payments.route";
import adminCommerceRoutes from "../modules/admin/admin-commerce.route";
import shippingRoutes from "../modules/shipping/shipping.route";
import couponRoutes from "../modules/coupons/coupons.route";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/reviews", reviewRoutes);
router.use("/cart", cartRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/payments", paymentRoutes);
router.use("/admin", adminCommerceRoutes);
router.use("/shipping", shippingRoutes);
router.use("/coupons", couponRoutes);
router.use("/settings", settingsRoutes);
router.use("/orders", orderRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/dashboard-management", dashboardRoutes);

export default router;
