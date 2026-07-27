import { Router } from "express";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { getDashboardStatisticsHandler } from "./dashboard.controller";

const router = Router();

router.use(authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"));

router.get("/", getDashboardStatisticsHandler);

export default router;