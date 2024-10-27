import express from "express";
import helmet from "helmet";
import cors from "cors";

import authRoutes from "./routes/authRoutes";
import protectedRoutes from "./routes/protectedRoutes";

import { ipRateLimiter, useRateLimitMiddleware } from "./middlewares/rateLimitMiddleware";
import errorHandler from "./middlewares/errorHandler";
import { authenticateUser } from "./middlewares/authMiddleware";

import logger from "./services/logger";

import { PORT, API_PATH } from "./utils/constants";

import { setupSwagger } from "./config/swaggerConfig";

const app = express();
app.use(express.json());

app.use(helmet());
app.use(cors());

app.use(ipRateLimiter);

app.use(API_PATH + "/auth", authRoutes);
app.use(API_PATH + "/api", authenticateUser, useRateLimitMiddleware, protectedRoutes);

app.use(errorHandler);

setupSwagger(app);

app.get("/", (req, res) => {
    res.send("The Forge API is running. <a href='" + API_PATH + "/auth/linkedin'>Login with Linkedin</a>");
});

app.listen(PORT, () => {
    logger.info(`The Forge API is running on port ${PORT}.`);
});

process.on('SIGINT', () => {
    logger.info('Server is shutting down gracefully');
    process.exit(0);
});

process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception occurred', { error });
    process.exit(1);  // Optional: Exit on critical failure
});

export default app;