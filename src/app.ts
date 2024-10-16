import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes";
import protectedRoutes from "./routes/protectedRoutes";
import userRoutes from "./routes/userRoutes";
import roleRoutes from "./routes/roleRoutes";

dotenv.config();

const app = express();
app.use(express.json());

app.use(helmet());
app.use(cors());

// Basic IP-based rate limiter: 100 requests per 15 minutes per IP
const ipRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per 15 minutes
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(ipRateLimiter);

app.use("/v1/auth", authRoutes);
app.use("/v1/api", protectedRoutes);
app.use("/v1/users", userRoutes);
app.use("/v1/roles", roleRoutes);

app.get("/", (req, res) => {
    res.send("The Forge API is running. <a href='/auth/linkedin'>Login with Linkedin</a>");
});

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
    console.log(`The Forge API is running on port ${port}.`);
});