import { Router } from "express";
import dotenv from "dotenv";
import { prisma } from "../config/prisma";
import passport from "../config/passport";
import { generateToken, verifyToken } from "../utils/jwt";
import { loginUser, registerUser } from "../controllers/authController";
import { authenticateUser } from "../middlewares/authMiddleware";
import logger from "../services/logger";
import { loginRateLimiter, registrationRateLimiter, oauthLinkingRateLimiter, oauthLoginRateLimiter } from "../middlewares/rateLimitMiddleware";

dotenv.config();

const providers = ['google', 'github', 'facebook', 'linkedin'];

const router = Router();

//JWT based User Login route
router.post("/login", loginRateLimiter, (req, res, next) => {
    logger.info("Login attempt");
    loginUser(req, res, next);
});

//JWT based User Registration route
router.post("/register", registrationRateLimiter, (req, res, next) => {
    logger.info("Registration attempt");
    registerUser(req, res, next);
});

//OAuth authentication routes (works for both login and linking). Just add ?linking=true to the URL for linking.
//Also, add token=yourtoken to the URL for linking, just after the ?linking=true&. The token will be used to check whether the user is authenticated to do so.
router.get("/:provider", (req, res, next) => {
    const provider = req.params.provider;

    if (!providers.includes(provider)) {
        logger.warn(`Invalid provider provided for authentication in request: ${provider}`);
        res.status(400).json({ message: 'Invalid provider' });
        return;
    }

    const isLinking = req.query.linking === 'true';
    const token = req.query.token as string; // Extract the token from the query parameter

    logger.info(`Processing OAuth request for provider: ${provider}, isLinking: ${isLinking}`);

    if (isLinking && token) {
        try {
            const decodedUser = verifyToken(token);
            logger.info(`Token payload: ${token}`);

            if (typeof decodedUser !== 'string' && 'id' in decodedUser) {
                logger.info(`Found user: ${decodedUser.id}`);
            } else {
                logger.warn(`Invalid token payload: ${JSON.stringify(decodedUser)}`);
                res.status(401).json({ message: 'Invalid token payload' });
                return;
            }

            // Store the token in the state parameter for use in the callback
            logger.info(`Starting OAuth process for provider linking: ${provider}, token: ${token}`);

            return oauthLinkingRateLimiter(req, res, () => passport.authenticate(provider)(req, res, next));

        } catch (error) {
            logger.error(`Error verifying token: ${error}`);
            res.status(401).json({ message: 'Invalid or expired token' });
            return;
        }

    } else {
        logger.info(`Starting OAuth process for provider authentication: ${provider}`);

        return oauthLoginRateLimiter(req, res, () => passport.authenticate(provider)(req, res, next));
    }
    
});

//OAuth callback routes
router.get("/:provider/callback", (req, res, next) => {
    const provider = req.params.provider;

    passport.authenticate(provider, { session: false }, async (err: any, user: any, info: any) => {
        if(err){
            try {
                const error = JSON.parse(err);
                logger.error(`Error message: ${error["message"]}, Error status: ${error["status"]}`);
                return res.status(error.status).send(error.message);
            } catch (e) {
                logger.error(`Error in parsing error message: ${e}`);
                return res.status(500).send("Internal Server Error");
            }
        } else if(user && 'id' in user) {
            logger.info(`Found user: ${user}`);
            let token: string;

            //If token is returned in the info parameter, reuse it. Else generate a new one
            if (info.length > 5) {
                token = info;
                logger.info(`Found token in callback: ${token}`);
            } else {
                token = generateToken(user.id as string);
            }
            
            // Ensure to sanitize user info before including in the redirect
            return res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${JSON.stringify({ id: user.id, username: user.username })}`); // Redirect with token and user id
        } else {
            logger.warn('User information is missing');
            return res.status(400).send('User information is missing');
        }
    })(req, res, next);
});

//OAuth unlink route
router.delete("/unlink/:provider", authenticateUser, async (req, res) => {
    const provider = req.params.provider;

    if (!providers.includes(provider)) {
        logger.warn(`Invalid provider provided for unlinking in request: ${provider}`);
        res.status(400).json({ message: 'Invalid provider' });
        return;
    }

    const userId = (req as any).user.id;

    logger.info(`Unlinking provider: ${provider} for user: ${userId}`);

    try {
        // Check if the provider is linked to the user
        const existingProvider = await prisma.user_provider.findFirst({
            where: {
                userId: userId,
                providerName: provider
            }
        });

        if (!existingProvider) {
            logger.warn(`No linked ${provider} account found for user: ${userId}`);
            res.status(404).json({ message: `No linked ${provider} account found for this user.` });
            return;
        }

        // Ensure the user has another provider or email/password login
        const otherProviders = await prisma.user_provider.count({
            where: { userId: userId, providerName: { not: provider } }
        });

        const user = await prisma.users.findUnique({ where: { id: userId } });
        if (!user?.password && otherProviders === 0) {
            logger.warn(`Cannot unlink the last provider for user: ${userId}`);
            res.status(400).json({ message: 'Cannot unlink the last provider. Add a password or another provider before unlinking.' });
            return;
        }

        // Unlink the provider by deleting the record
        await prisma.user_provider.delete({
            where: {
                id: existingProvider.id
            }
        });

        logger.info(`${provider} account unlinked successfully for user: ${userId}`);
        res.json({ message: `${provider} account unlinked successfully.` });
        return;
    } catch (error) {
        logger.error(`Error unlinking provider: ${error}`);
        res.status(500).json({ message: "An error occurred while unlinking the provider." });
        return;
    }
})

export default router;