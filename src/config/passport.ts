import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as LinkedinStrategy } from "passport-linkedin-oauth2";
import { prisma } from "./prisma";
import { verifyToken } from "../utils/jwt";

const middle_api_auth_path = "/v1/auth";

// Define provider scopes
const providerScopes: Record<string, string[]> = {
    google: ['email', 'profile'],
    github: ['user:email'],
    facebook: ['email'],
    linkedin: ['r_emailaddress', 'r_liteprofile']
};

/**
 * Creates an OAuth strategy for a given provider.
 * @param {string} provider The provider of the OAuth strategy.
 * @param {object} options The options for the OAuth strategy.
 * @param {function} verify The verify function for the OAuth strategy.
 * @returns {OAuthStrategy} The OAuth strategy for the given provider.
 */
const createStrategy = (provider: 'google' | 'github' | 'facebook' | 'linkedin', options: any, verify: any) => {
    const strategies = {
        google: GoogleStrategy,
        github: GitHubStrategy,
        facebook: FacebookStrategy,
        linkedin: LinkedinStrategy
    };

    const Strategy = strategies[provider];

    if (!Strategy) {
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
async function linkProvider(token: string, profile: any, done: (error: any, user?: any) => void) {
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
        return done(JSON.stringify({
            message: 'This provider is already linked to your account',
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
    return done(null, updatedUser);
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

    console.log("Email: ", email);
    
    console.log("Now checking if user exists...");
    const existingUser = await prisma.users.findUnique({
        where: { email },
        include: { providers: true }
    });

    if (existingUser) {
        // Check if this provider is already linked
        console.log("Checking if this provider is already linked with another account...");
        const existingProvider = existingUser.providers.find(provider => provider.providerName === profile.provider);
        if (!existingProvider) {
            console.log("This account is already linked to a different provider");
            return done(JSON.stringify({
                message: 'An account with this email already exists',
                status: 409
            }));
        }
        console.log("Found existing user: ", existingUser);
        return done(null, existingUser); // Returning the existing user
    }

    // Create new user
    console.log("Creating new user...");
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

    console.log("New user created: ", newUser);
    return done(null, newUser);
}

/**
 * Sets up a Passport OAuth strategy for the given provider.
 *
 * @param {string} provider - The provider to set up (e.g. 'google', 'github', 'facebook', 'linkedin')
 * @throws {Error} If the provider's client ID or secret is not set in the environment variables
 */
const setupOAuthStrategy = (provider: 'google' | 'github' | 'facebook' | 'linkedin') => {
    if (!process.env[`${provider.toUpperCase()}_CLIENT_ID`] || !process.env[`${provider.toUpperCase()}_CLIENT_SECRET`]) {
        throw new Error(`${provider.toUpperCase()}_CLIENT_ID or ${provider.toUpperCase()}_CLIENT_SECRET environment variable is not set`);
    }

    const baseCallbackURL = `${process.env.HOST_CALLBACK_URL}${middle_api_auth_path}/${provider}/callback`;

    passport.use(provider,
        createStrategy(provider, {
            clientID: process.env[`${provider.toUpperCase()}_CLIENT_ID`],
            clientSecret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`],
            callbackURL: baseCallbackURL,
            passReqToCallback: true,
            enableProof: true,                              //For Facebook exclusively
            scope: providerScopes[provider],
            profileFields: ['id', 'displayName', 'email']   //For Facebook exclusively
            }, 
            async (request: any, accessToken: any, refreshToken: any, profile: any, done: (error: any, user?: any) => void) => {
                try {

                    console.log(profile.provider.toUpperCase() + " profile: ", profile);

                    // Check if we are linking the provider to an existing user (JWT provided in state)
                    const token = request.query.state as string;
                    if (token) {
                        return await linkProvider(token, profile, done);
                    } else {
                        // Handle new user creation or login
                        return await authenticateSessionJWT(profile, done);
                    }

                } catch (error) {
                    return done(error);
                }
            }
        )
    )
}

setupOAuthStrategy('google');
setupOAuthStrategy('github');
setupOAuthStrategy('facebook');
setupOAuthStrategy('linkedin');

passport.serializeUser((user: any, done) => {
    done(null, user.id); // Serialize the user ID into the session
});

passport.deserializeUser( async (id: string, done) => {
    try {
        //Find user by id and deserialize the user from the session
        const user = await prisma.users.findUnique({ where: { id } })
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;