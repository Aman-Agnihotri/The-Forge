import { Router } from "express";
import { prisma } from "../config/prisma";
import passport from "../controllers/passportController";
import { PROVIDERS, HOST_UI_URL } from "../utils/constants";
import { generateToken, verifyToken } from "../utils/jwt";
import { loginUser, registerUser } from "../controllers/authController";
import { authenticateUser } from "../middlewares/authMiddleware";
import logger from "../services/logger";
import { loginRateLimiter, registrationRateLimiter, oauthLinkingRateLimiter, oauthLoginRateLimiter } from "../middlewares/rateLimitMiddleware";

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user with JWT-based authentication.
 *     description: Authenticates a user using their credentials and returns a JWT token.
 *     tags: [Authentication]
 *     requestBody:
 *       description: User credentials (email, password) for login.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully logged in the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *       401:
 *         description: Invalid credentials.
 *       429:
 *         description: Too many login attempts (rate-limited).
 *       500:
 *         description: Internal server error.
 */

router.post("/login", loginRateLimiter, (req, res, next) => {
    logger.info("Login attempt");
    loginUser(req, res, next);
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user.
 *     description: Creates a new user account with the provided information and returns a JWT token.
 *     tags: [Authentication]
 *     requestBody:
 *       description: User registration data.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role_name:
 *                 type: string
 *                 description: Optional role name to assign to the user.
 *     responses:
 *       201:
 *         description: User successfully registered.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *       400:
 *         description: Missing required fields.
 *       409:
 *         description: User already exists.
 *       429:
 *         description: Too many registration attempts (rate-limited).
 *       500:
 *         description: Internal server error.
 */

router.post("/register", registrationRateLimiter, (req, res, next) => {
    logger.info("Registration attempt");
    registerUser(req, res, next);
});

//OAuth authentication routes (works for both login and linking). Just add ?linking=true to the URL for linking.
//Also, add token=yourtoken to the URL for linking, just after the ?linking=true&. The token will be used to check whether the user is authenticated to do so.

/**
 * @swagger
 * /auth/{provider}:
 *   get:
 *     summary: Initiate OAuth login or provider linking.
 *     description: Starts the OAuth process for logging in or linking a provider to an existing account.
 *     tags: [OAuth]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         description: OAuth provider (e.g., google, github).
 *         schema:
 *           type: string
 *       - in: query
 *         name: linking
 *         description: Specify if the OAuth provider is being linked to an existing account.
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: token
 *         description: JWT token used for linking the OAuth provider to an existing account.
 *         schema:
 *           type: string
 *     responses:
 *       400:
 *         description: Invalid provider.
 *       401:
 *         description: Invalid or expired JWT token.
 *       429:
 *         description: Too many OAuth requests (rate-limited).
 */

router.get("/:provider", (req, res, next) => {
    const provider = req.params.provider;

    if (!PROVIDERS.includes(provider)) {
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

/**
 * @swagger
 * /auth/{provider}/callback:
 *   get:
 *     summary: Handle the OAuth provider callback.
 *     description: Processes the callback from the OAuth provider after authentication.
 *     tags: [OAuth]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         description: OAuth provider (e.g., google, github).
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Successfully authenticated, redirects with a JWT token.
 *       400:
 *         description: User information is missing.
 *       500:
 *         description: Internal server error during OAuth callback.
 */

router.get("/:provider/callback", (req, res, next) => {
    const provider = req.params.provider;

    passport.authenticate(provider, { session: false }, async (err: any, user: any, info: any) => {
        if(err){
            try {
                const error = JSON.parse(err);
                logger.warn(`Error message: ${error["message"]}\nError status: ${error["status"]}`);
                return res.status(error.status).send(error.message);
            } catch (e) {
                logger.error(`Error in parsing error message: ${e}`);
                next(e);
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
            return res.redirect(`${HOST_UI_URL}?token=${token}&user=${JSON.stringify({ id: user.id, username: user.username })}`); // Redirect with token and user id
        } else {
            logger.warn('User information is missing');
            return res.status(400).send('User information is missing');
        }
    })(req, res, next);
});

/**
 * @swagger
 * /auth/unlink/{provider}:
 *   delete:
 *     summary: Unlink an OAuth provider from the user's account.
 *     description: Unlinks a connected OAuth provider from the user's account.
 *     tags: [OAuth]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         description: OAuth provider to unlink (e.g., google, github).
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider successfully unlinked.
 *       400:
 *         description: Cannot unlink the last provider.
 *       404:
 *         description: No linked provider found.
 *       500:
 *         description: An error occurred while unlinking the provider.
 */

router.delete("/unlink/:provider", authenticateUser, async (req, res) => {
    const provider = req.params.provider;

    if (!PROVIDERS.includes(provider)) {
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