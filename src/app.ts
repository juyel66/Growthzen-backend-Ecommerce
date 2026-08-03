import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import apiRoutes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { checkMaintenanceMode } from "./middlewares/maintenance.middleware";

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
].filter(Boolean) as string[];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, same-origin postman)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.some((allowed) => origin.startsWith(allowed))
    ) {
      return callback(null, true);
    }

    return callback(
      new Error(`CORS policy violation: Origin ${origin} is not allowed by CORS`)
    );
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "Accept",
    "Origin",
    "Cookie",
    "X-Requested-With",
    "Idempotency-Key",
    "idempotency-key",
    "X-Idempotency-Key",
    "x-idempotency-key",
    "Cache-Control",
    "Pragma",
  ],
  exposedHeaders: ["Set-Cookie", "Idempotency-Key", "idempotency-key"],
  optionsSuccessStatus: 200,
};

const app: Express = express();

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
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

/**
 * API Routes
 */
app.use("/api/v1", checkMaintenanceMode, apiRoutes);

/**
 * Global Error Handler .
 */
app.use(errorHandler);

export default app;