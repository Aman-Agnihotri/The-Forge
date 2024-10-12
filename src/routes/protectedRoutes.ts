import { Router } from "express";
import { authenticateUser } from "../middlewares/authMiddleware";
import { prisma } from "../config/prisma";

const router = Router();

//A protected route that requires authentication
router.get("/", authenticateUser, async (req: any, res: any) => {
    // Access the user object attached in the middleware
    const user = req.user;

    const userinfo = await prisma.users.findUnique({ where: { id: user.id } });

    res.json({
        message: `Welcome to the secret club, ${userinfo?.username}!`,
        user
    });
});

export default router;