import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as LinkedinStrategy } from "passport-linkedin-oauth2";
import { prisma } from "./prisma";
import { verifyToken } from "../utils/jwt";
import logger from "../services/logger";
import { DEFAULT_ROLE, OAuthProvider, providerScopes, PROVIDERS } from "../utils/constants";

import { getClientId, getClientSecret, getAuthCallbackURL } from "../utils/utils";

/**
 * Creates an OAuth strategy for a given provider.
 * @param {string} provider The provider of the OAuth strategy.
 * @param {object} options The options for the OAuth strategy.
 * @param {function} verify The verify function for the OAuth strategy.
 * @returns {OAuthStrategy} The OAuth strategy for the given provider.
 */
const createStrategy = (provider: OAuthProvider, options: any, verify: any) => {
    const strategies = {
        google: GoogleStrategy,
        github: GitHubStrategy,
        facebook: FacebookStrategy,
        linkedin: LinkedinStrategy
    };

    const Strategy = strategies[provider];

    if (!Strategy) {
        logger.error(`Unsupported strategy provider: ${provider}`);
        throw new Error(`Unsupported strategy provider: ${provider}`);
    }

    if (provider === 'google') {
        return new GoogleStrategy(options, verify);
    } else if (provider === 'github') {
        return new GitHubStrategy(options, verify);
    } else if (provider === 'facebook') {
        return new FacebookStrategy(options, verify);
    } else if (provider === 'linkedin') {
        return new LinkedinStrategy(options, verify);
    } else {
        logger.error(`Unsupported strategy provider: ${provider}`);
        throw new Error(`Unsupported strategy provider: ${provider}`);
    }
}

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
    let decoded;
    let loggedInUserId: string;
    try {
        decoded = verifyToken(token);
        if (typeof decoded !== 'string' && 'id' in decoded) {
            loggedInUserId = decoded.id;
        } else {
            throw new Error('Invalid or expired JWT token');
        }
    } catch (err) {
        logger.warn('Invalid or expired JWT token received during provider linking');
        return done(JSON.stringify({
            message: 'Invalid or expired JWT token',
            status: 401
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
        logger.warn(`User ${loggedInUserId} tried to link an already linked provider: ${profile.provider}`);
        return done(JSON.stringify({
            message: 'This provider is already linked to your account',
            status: 409
        }));
    }

    const existingUserEmail = await prisma.users.findUnique({
        where: { id: loggedInUserId },
        select: { email: true }
    });
    // Check if the OAuth account that the user is trying to link has the same email as the logged in user
    if (existingUserEmail && existingUserEmail.email !== profile.emails[0].value) {
        logger.warn(`User ${loggedInUserId} tried to link a provider with a different email: ${profile.emails[0].value}`);
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
    logger.warn(`User ${loggedInUserId} tried to link a provider with a different email: ${profile.emails[0].value}`);
    return done(null, updatedUser, token);
}

/**
 * Handles OAuth authentication by creating a new user if not already present, 
 * linking the provider to the user, and generating a JWT token.
 *
 * @param {object} profile - OAuth profile object
 * @param {function} done - passport callback function
 */
async function authenticateSessionJWT(profile: any, done: (error: any, user?: any) => void) {
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
        logger.error('Default role `${DEFAULT_ROLE}` for OAuth not found');
        return done(JSON.stringify({
            message: 'Default role `${DEFAULT_ROLE}` for OAuth not found',
            status: 500
        }));
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

passport.serializeUser((user: any, done) => {
    done(null, user.id); // Serialize the user ID into the session
});

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