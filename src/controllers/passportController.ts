import passport from "passport";
import { prisma } from "../config/prisma";
import { verifyToken, JsonWebTokenError, TokenExpiredError } from "../utils/jwt";
import logger from "../services/logger";
import { DEFAULT_ROLE, OAuthProvider, providerScopes, PROVIDERS } from "../utils/constants";

import { getClientId, getClientSecret, getAuthCallbackURL, createStrategy } from "../utils/utils";

/**
 * Links an OAuth provider to a user's account.
 *
 * This function takes a JWT token (from the state parameter), verifies it, and
 * uses it to get the user ID. It then checks if the given provider is already
 * linked to the user's account, and if not, links it.
 *
 * @param {string} token - JWT token from the state parameter
 * @param {object} profile - OAuth profile object
 * @param {function} done - passport callback function
 */
async function linkProvider(token: string, profile: any, done: (error: any, user?: any, info?: any) => void) {
    try {
        const decodedUser = verifyToken(token);
        let loggedInUserId: string;

        if (typeof decodedUser !== 'string' && 'id' in decodedUser) {
            loggedInUserId = decodedUser.id;
        } else {
            logger.warn("Invalid token payload received during provider linking: " + JSON.stringify(decodedUser));
            return done(JSON.stringify({
                message: 'Invalid token payload',
                status: 401
            }));
        }

        const user = await prisma.users.findUnique({ where: { id: loggedInUserId } });

        if (!user) {
            logger.warn("User with ID '" + loggedInUserId + "' not found");
            return done(JSON.stringify({
                message: 'User not found',
                status: 404
            }));
        }

        // Check if provider is already linked
        const existingProvider = await prisma.user_provider.findFirst({
            where: {
                userId: loggedInUserId,
                providerName: profile.provider
            }
        });

        if (existingProvider) {
            logger.warn("User '" + loggedInUserId + "' tried to link an already linked provider: " + profile.provider);
            return done(JSON.stringify({
                message: 'This provider is already linked to your account',
                status: 409
            }));
        }

        // Check if the OAuth account that the user is trying to link has the same email as the logged in user
        if (user.email !== profile.emails[0].value) {
            logger.warn("User '" + loggedInUserId + "' tried to link a provider with a different email: " + profile.emails[0].value);
            return done(JSON.stringify({
                message: 'The OAuth account that you are trying to link has a different email than your account',
                status: 409
            }));
        }

        // Link the new provider to the user
        const updatedUser = await prisma.users.update({
            where: { id: loggedInUserId },
            data: {
                providers: {
                    create: {
                        providerName: profile.provider,
                        providerId: profile.id,
                    }
                }
            }
        });

        logger.info("User '" + loggedInUserId + "' successfully linked provider: " + profile.provider);
        return done(null, updatedUser, token);
        
    } catch (error) {
        if (error instanceof TokenExpiredError){
            logger.warn("Token expired: " + error.message);
            return done(JSON.stringify({
                message: 'Token has expired',
                status: 401
            }))
        } else if (error instanceof JsonWebTokenError) {
            logger.warn("Malformed token: " + error.message);
            return done(JSON.stringify({
                message: 'Malformed token',
                status: 401
            }))
        } else {
            return done(JSON.stringify({
                message: 'An error occurred during provider linking: ' + error,
                status: 500
            }))
        }
    }
}

/**
 * Handles OAuth authentication by creating a new user if not already present, 
 * linking the provider to the user, and generating a JWT token.
 *
 * @param {object} profile - OAuth profile object
 * @param {function} done - passport callback function
 */
async function authenticateSessionJWT(profile: any, done: (error: any, user?: any) => void) {
    try {
        const email = profile.emails ? profile.emails[0].value : '';
    
        const existingUser = await prisma.users.findUnique({
            where: { email },
            include: { providers: true }
        });

        if (existingUser) {
            // Check if this provider is already linked
            const existingProvider = existingUser.providers.find(provider => provider.providerName === profile.provider);
            if (!existingProvider) {
                logger.warn(`Email conflict during OAuth authentication for email: ${email}`);
                return done(JSON.stringify({
                    message: 'An account with this email already exists',
                    status: 409
                }));
            }
            logger.info(`OAuth login successful for user: ${existingUser.id}`);
            return done(null, existingUser); // Returning the existing user
        }

        // Check if default role exists
        const defaultRole = await prisma.roles.findUnique({ where: { name: DEFAULT_ROLE } });
        if (!defaultRole) {
            throw new Error("Default role '" + DEFAULT_ROLE + "' not found");
        }

        // Create new user
        const newUser = await prisma.users.create({
            data: {
                username: profile.displayName,
                email,
                providers: {
                    create: {
                        providerName: profile.provider,
                        providerId: profile.id,
                    }
                }
            }
        });

        // Assign default role to the new user
        await prisma.user_role.create({
            data: {
                userId: newUser.id,
                roleId: defaultRole.id
            }
        });

        logger.info(`New user created via OAuth with provider: ${profile.provider}, email: ${email}, role: ${defaultRole.name}`);
        return done(null, newUser);
    } catch (error) {
        return done(JSON.stringify({
            message: 'An error occurred during OAuth authentication: ' + error,
            status: 500
        }));
    }
}

/**
 * Sets up a Passport OAuth strategy for the given provider.
 *
 * @param {string} provider - The provider to set up (e.g. 'google', 'github', 'facebook', 'linkedin')
 * @throws {Error} If the provider's client ID or secret is not set in the environment variables
 */
const setupOAuthStrategy = (provider: OAuthProvider) => {

    const CallbackURL = getAuthCallbackURL(provider);

    passport.use(provider,
        createStrategy(provider, {
            clientID: getClientId(provider),
            clientSecret: getClientSecret(provider),
            callbackURL: CallbackURL,
            passReqToCallback: true,
            enableProof: true,                              //For Facebook exclusively
            scope: providerScopes[provider],
            profileFields: ['id', 'displayName', 'email']   //For Facebook exclusively
            }, 
            async (request: any, accessToken: any, refreshToken: any, profile: any, done: (error: any, user?: any, info?: any) => void) => {
                try {

                    logger.info(`Processing OAuth callback for provider: ${profile.provider}`);

                    // Check if we are linking the provider to an existing user (JWT provided in state)
                    const token = request.query.state as string;
                    if (token) {
                        return await linkProvider(token, profile, done);
                    } else {
                        // Handle new user creation or login
                        return await authenticateSessionJWT(profile, done);
                    }

                } catch (error) {
                    logger.error(`Error during OAuth process for provider ${profile.provider}: ${(error as any).message}`);
                    return done(error);
                }
            }
        )
    )
}

// Setup OAuth strategies for all providers
for (const provider of PROVIDERS) {
    setupOAuthStrategy(provider as OAuthProvider);
}


/**
 * Serializes the user ID into the session.
 *
 * This function is called during login to store the user ID in the session cookie.
 *
 * @param {object} user - The authenticated user object
 * @param {function} done - Callback to pass control to the next middleware
 */
passport.serializeUser((user: any, done) => {
    done(null, user.id); // Serialize the user ID into the session
});

/**
 * Deserializes the user from the session.
 *
 * This function retrieves the user by their ID from the session cookie, allowing session persistence.
 *
 * @param {string} id - The ID of the user stored in the session
 * @param {function} done - Callback to pass control to the next middleware
 */
passport.deserializeUser( async (id: string, done) => {
    try {
        //Find user by id and deserialize the user from the session
        const user = await prisma.users.findUnique({ where: { id } })
        logger.info(`Deserialized user: ${id}`);
        done(null, user);
    } catch (error) {
        logger.error(`Error deserializing user: ${id} - ${(error as any).message}`);
        done(error, null);
    }
});

export default passport;