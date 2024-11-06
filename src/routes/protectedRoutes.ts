import { Router } from "express";
import { prisma } from "../config/prisma";

import userRoutes from "./userRoutes";
import roleRoutes from "./roleRoutes";

import logger from "../services/logger";
import { useRateLimitMiddleware } from "../middlewares/rateLimitMiddleware";

const router = Router();

router.use((req, res, next) => {
    logger.debug(`Request received: ${req.method} ${req.url}`);
    next();
});

router.use("/users", useRateLimitMiddleware, userRoutes);
router.use("/roles", useRateLimitMiddleware, roleRoutes);

/**
 * @swagger
 * /api/:
 *   get:
 *     summary: Access a protected route.
 *     description: Access a protected route that requires authentication.
 *     tags: [Protected]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully accessed the protected route.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *       401:
 *         description: Unauthorized access.
 *       429:
 *         description: Rate limit exceeded.
 *       500:
 *         description: Internal server error.
 */
router.get("/", async (req: any, res: any, next: any) => {
    try {
        // Access the user object attached in the middleware
        const user = req.user;

        const userinfo = await prisma.users.findUnique({ where: { id: user.id },
            select: {
                id: true,
                username: true
            } 
        });

        logger.debug(`User '${userinfo?.username}' accessed the protected route`);
        res.json({ message: `Welcome to the secret club, ${userinfo?.username}!`, userinfo });
    } catch (error) {
        next({ message: "Error accessing protected route", error });
    }
});

export default router;