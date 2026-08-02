import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import apiRoutes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

const app: Express = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.json({
    message: "E-commerce backend is running",
  });
});

/**
 * OpenAPI JSON
 */
app.get("/growthzen-api/openapi.json", (_req, res) => {
  res.status(200).json(swaggerSpec);
});

/**
 * Swagger UI
 */
app.use(
  "/growthzen-api",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
  })
);

import { checkMaintenanceMode } from "./middlewares/maintenance.middleware";

/**
 * API Routes
 */
app.use("/api/v1", checkMaintenanceMode, apiRoutes);

/**
 * Global Error Handler .
 */
app.use(errorHandler);

export default app;