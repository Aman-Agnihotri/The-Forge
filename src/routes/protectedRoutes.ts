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

        logger.info(`User '${userinfo?.username}' accessed the protected route`);
        res.json({ message: `Welcome to the secret club, ${userinfo?.username}!`, userinfo });
    } catch (error) {
        logger.error(`Error accessing protected route: ${(error as any).message}`);
        next(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;