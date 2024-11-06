import { Router } from "express";
import { prisma } from "../config/prisma";
import passport from "../controllers/passportController";
import { PROVIDERS, HOST_UI_URL } from "../utils/constants";
import { generateToken } from "../utils/jwt";
import { loginUser, registerUser, refreshToken } from "../controllers/authController";
import { authenticateUser } from "../middlewares/authMiddleware";
import logger from "../services/logger";
import { loginRateLimiter, registrationRateLimiter, tokenRefreshRateLimiter, oauthLinkingRateLimiter, oauthLoginRateLimiter, oauthUnlinkingRateLimiter } from "../middlewares/rateLimitMiddleware";

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
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *       400:
 *         description: Bad request or missing required fields.
 *       401:
 *         description: Invalid credentials.
 *       429:
 *         description: Too many login attempts (rate-limited).
 *       500:
 *         description: Internal server error.
 */

router.post("/login", loginRateLimiter, (req, res, next) => {
    logger.debug("Login attempt");
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
 *                 refreshToken:
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
    logger.debug("Registration attempt");
    registerUser(req, res, next);
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh an existing JWT token.
 *     description: Refreshes an existing JWT token and returns a new one.
 *     tags: [Authentication]
 *     requestBody:
 *       description: Refresh token to acquire a new JWT token.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token.
 *     responses:
 *       200:
 *         description: JWT token successfully refreshed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: Refresh token is missing from the request
 *       401:
 *         description: Invalid or expired refresh token
 *       429:
 *         description: Too many token refresh attempts (rate-limited).
 *       500:
 *         description: Internal server error.
 */
router.post("/refresh", tokenRefreshRateLimiter, (req, res, next) => {
    logger.debug("Token refresh attempt");
    refreshToken(req, res, next);
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
        logger.info(`Invalid provider provided for authentication in request: ${provider}`);
        res.status(400).json({ message: 'Invalid provider' });
        return;
    }

    const isLinking = req.query.linking === 'true';
    const token = req.query.token as string; // Extract the token from the query parameter

    logger.debug(`Processing OAuth request for provider: ${provider}, isLinking: ${isLinking}`);

    if (isLinking) {
        if (!token) {
            logger.info(`Missing token in request for provider linking: ${provider}`);
            res.status(400).json({ message: 'Missing token' });
            return;
        }

        // Store the token in the state parameter for use in the callback
        logger.debug(`Starting OAuth process for provider linking: ${provider}, token: ${token}`);

        return oauthLinkingRateLimiter(req, res, () => passport.authenticate(provider)(req, res, next));

    } else {
        logger.debug(`Starting OAuth process for provider authentication: ${provider}`);

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
                logger.info(`Error message: ${error["message"]}\nError status: ${error["status"]}`);
                return res.status(error.status).send(error.message);
            } catch (e) {
                logger.error(`Error in parsing error message: ${e}`);
                next({message: "Error in parsing error message in the OAuth callback", error: e });
            }
        } else if(user && 'id' in user) {
            logger.debug(`Found user: ${user}`);
            let token: string;

            //If token is returned in the info parameter, reuse it. Else generate a new one
            if (info.length > 5) {
                token = info;
                logger.debug(`Found token in callback: ${token}`);
            } else {
                token = generateToken(user.id as string);
            }
            
            // Ensure to sanitize user info before including in the redirect
            return res.redirect(`${HOST_UI_URL}?token=${token}&user=${JSON.stringify({ id: user.id, username: user.username })}`); // Redirect with token and user id
        } else {
            logger.info('User information is missing');
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
 *       429:
 *         description: Too many unlinks (rate-limited).
 *       500:
 *         description: An error occurred while unlinking the provider.
 */

router.delete("/unlink/:provider", authenticateUser, oauthUnlinkingRateLimiter, async (req, res, next) => {
    const provider = req.params.provider;

    if (!PROVIDERS.includes(provider)) {
        logger.info(`Invalid provider provided for unlinking in request: ${provider}`);
        res.status(400).json({ message: 'Invalid provider' });
        return;
    }

    const userId = (req as any).user.id;

    logger.debug(`Unlinking provider: ${provider} for user: ${userId}`);

    try {
        // Check if the provider is linked to the user
        const existingProvider = await prisma.user_provider.findFirst({
            where: {
                userId: userId,
                providerName: provider
            }
        });

        if (!existingProvider) {
            logger.info(`No linked ${provider} account found for user: ${userId}`);
            res.status(404).json({ message: `No linked ${provider} account found for this user.` });
            return;
        }

        // Ensure the user has another provider or email/password login
        const otherProviders = await prisma.user_provider.count({
            where: { userId: userId, providerName: { not: provider } }
        });

        const user = await prisma.users.findUnique({ where: { id: userId } });
        if (!user?.password && otherProviders === 0) {
            logger.info(`Cannot unlink the last provider for user: ${userId}`);
            res.status(400).json({ message: 'Cannot unlink the last provider. Add a password or another provider before unlinking.' });
            return;
        }

        // Unlink the provider by deleting the record
        await prisma.user_provider.delete({
            where: {
                id: existingProvider.id
            }
        });

        logger.debug(`${provider} account unlinked successfully for user: ${userId}`);
        res.json({ message: `${provider} account unlinked successfully.` });
        return;
    } catch (error) {
        next({ message: "An error occurred while unlinking the provider.", error });
    }
})

export default router;