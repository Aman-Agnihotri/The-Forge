import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";

import authRoutes from "./routes/authRoutes";
import protectedRoutes from "./routes/protectedRoutes";

import { ipRateLimiter, useRateLimitMiddleware } from "./middlewares/rateLimitMiddleware";
import errorHandler from "./middlewares/errorHandler";
import { authenticateUser } from "./middlewares/authMiddleware";

import logger from "./services/logger";

import { setupSwagger } from "./config/swaggerConfig";

dotenv.config();

const app = express();
app.use(express.json());

app.use(helmet());
app.use(cors());

app.use(ipRateLimiter);

app.use("/v1/auth", authRoutes);
app.use("/v1/api", useRateLimitMiddleware, authenticateUser, protectedRoutes);

app.use(errorHandler);

setupSwagger(app);

app.get("/", (req, res) => {
    res.send("The Forge API is running. <a href='/auth/linkedin'>Login with Linkedin</a>");
});

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
    logger.info(`The Forge API is running on port ${port}.`);
});

process.on('SIGINT', () => {
    logger.info('Server is shutting down gracefully');
    process.exit(0);
});

process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception occurred', { error });
    process.exit(1);  // Optional: Exit on critical failure
});