import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";

import authRoutes from "./routes/authRoutes";
import protectedRoutes from "./routes/protectedRoutes";

import { ipRateLimiter, useRateLimitMiddleware } from "./middlewares/rateLimitMiddleware";

dotenv.config();

const app = express();
app.use(express.json());

app.use(helmet());
app.use(cors());

app.use(ipRateLimiter);

app.use("/v1/auth", authRoutes);
app.use("/v1/api", useRateLimitMiddleware, protectedRoutes);

app.get("/", (req, res) => {
    res.send("The Forge API is running. <a href='/auth/linkedin'>Login with Linkedin</a>");
});

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
    console.log(`The Forge API is running on port ${port}.`);
});