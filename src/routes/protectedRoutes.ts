import { Router } from "express";
import { prisma } from "../config/prisma";

import userRoutes from "./userRoutes";
import roleRoutes from "./roleRoutes";

import logger from "../services/logger";

const router = Router();

router.use((req, res, next) => {
    logger.info(`Request received: ${req.method} ${req.url}`);
    next();
});

router.use("/users", userRoutes);
router.use("/roles", roleRoutes);

// A protected route that requires authentication
router.get("/", async (req: any, res: any) => {
    try {
        // Access the user object attached in the middleware
        const user = req.user;

        const userinfo = await prisma.users.findUnique({ where: { id: user.id } });

        logger.info(`User ${userinfo?.username} accessed the protected route`);
        res.json({
            message: `Welcome to the secret club, ${userinfo?.username}!`,
            user
        });
    } catch (error) {
        logger.error(`Error accessing protected route: ${(error as any).message}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;