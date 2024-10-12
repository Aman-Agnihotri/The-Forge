import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as LinkedinStrategy } from "passport-linkedin-oauth2";
import { prisma } from "./prisma";

const middle_api_auth_path = "/v1/auth";

if (!process.env.HOST_CALLBACK_URL) {
    throw new Error('HOST_CALLBACK_URL environment variable is not set');
}

if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
} else if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_SECRET environment variable is not set');
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.HOST_CALLBACK_URL + middle_api_auth_path + "/google/callback",
    passReqToCallback: true
}, async (Request, accessToken, refreshToken, profile, done) => {
    try {

        const email = profile.emails ? profile.emails[0].value : '';
        
        //Check if user with the same email already exists
        const existingUser = await prisma.users.findUnique({
            where: { email },
            include: { providers: true }
        });
        
        if (existingUser) {
            // Check if this provider is already linked
            const existingProvider = existingUser.providers.find(provider => provider.providerName === 'google');

            if (!existingProvider) {
                // Send an error message saying that an account with this email already exists
                const error = {
                    message: 'An account with this email already exists',
                    status: 409 //Conflict
                }
                return done(JSON.stringify(error));
            }

            return done(null, existingUser); //Return the existing user

        } else {
            //Create new user
            const newUser = await prisma.users.create({
                data: {
                    username: profile.displayName,
                    email,
                    providers: {
                        create: {
                            providerName: 'google',
                            providerId: profile.id,
                        }
                    }
                }
            });
            return done(null, newUser);
        }
    } catch (error) {
        return done(error);
    }
}));

if (!process.env.GITHUB_CLIENT_ID) {
    throw new Error('GITHUB_CLIENT_ID environment variable is not set');
} else if (!process.env.GITHUB_CLIENT_SECRET) {
    throw new Error('GITHUB_CLIENT_SECRET environment variable is not set');
}

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.HOST_CALLBACK_URL + middle_api_auth_path + "/github/callback",
    passReqToCallback: true,
    scope: ['user:email']
}, async (Request: any, accessToken: any, refreshToken: any, profile: any, done: (error: any, user?: any) => void) => {
    try {
        const email = profile.emails ? profile.emails[0].value : '';
        
        //Check if user with the same email already exists
        const existingUser = await prisma.users.findUnique({
            where: { email },
            include: { providers: true }
        });
        
        if (existingUser) {
            // Check if this provider is already linked
            const existingProvider = existingUser.providers.find(provider => provider.providerName === 'github');

            if (!existingProvider) {
                // Send an error message saying that an account with this email already exists
                const error = {
                    message: 'An account with this email already exists',
                    status: 409 //Conflict
                }
                return done(JSON.stringify(error));
            }

            return done(null, existingUser); //Return the existing user

        } else {
            //Create new user
            const newUser = await prisma.users.create({
                data: {
                    username: profile.displayName,
                    email,
                    providers: {
                        create: {
                            providerName: 'github',
                            providerId: profile.id,
                        }
                    }
                }
            });
            return done(null, newUser);
        }
    } catch (error) {
        return done(error);
    }
}));

if(!process.env.FACEBOOK_APP_ID) {
    throw new Error('FACEBOOK_APP_ID environment variable is not set');
} else if (!process.env.FACEBOOK_APP_SECRET) {
    throw new Error('FACEBOOK_APP_SECRET environment variable is not set');
}

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.HOST_CALLBACK_URL + middle_api_auth_path + "/facebook/callback",
    passReqToCallback: true,
    enableProof: true,
    profileFields: ['id', 'displayName', 'email']
}, async (Request: any, accessToken: any, refreshToken: any, profile: any, done: (error: any, user?: any) => void) => {
    try {
        const email = profile.emails ? profile.emails[0].value : '';
        
        //Check if user with the same email already exists
        const existingUser = await prisma.users.findUnique({
            where: { email },
            include: { providers: true }
        });
        
        if (existingUser) {
            // Check if this provider is already linked
            const existingProvider = existingUser.providers.find(provider => provider.providerName === 'facebook');

            if (!existingProvider) {
                // Send an error message saying that an account with this email already exists
                const error = {
                    message: 'An account with this email already exists',
                    status: 409 //Conflict
                }
                return done(JSON.stringify(error));
            }

            return done(null, existingUser); //Return the existing user

        } else {
            //Create new user
            const newUser = await prisma.users.create({
                data: {
                    username: profile.displayName,
                    email,
                    providers: {
                        create: {
                            providerName: 'facebook',
                            providerId: profile.id,
                        }
                    }
                }
            });
            return done(null, newUser);
        }
    } catch (error) {
        return done(error);
    }
}));

if (!process.env.LINKEDIN_CLIENT_ID) {
    throw new Error('LINKEDIN_CLIENT_ID environment variable is not set');
} else if (!process.env.LINKEDIN_CLIENT_SECRET) {
    throw new Error('LINKEDIN_CLIENT_SECRET environment variable is not set');
}

passport.use(new LinkedinStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: process.env.HOST_CALLBACK_URL + middle_api_auth_path + "/linkedin/callback",
    scope: ['r_emailaddress', 'r_liteprofile'],
    passReqToCallback: true
}, async (Request: any, accessToken: any, refreshToken: any, profile: any, done: (error: any, user?: any) => void) => {
    try {
        const email = profile.emails ? profile.emails[0].value : '';
        
        //Check if user with the same email already exists
        const existingUser = await prisma.users.findUnique({
            where: { email },
            include: { providers: true }
        });
        
        if (existingUser) {
            // Check if this provider is already linked
            const existingProvider = existingUser.providers.find(provider => provider.providerName === 'linkedin');

            if (!existingProvider) {
                // Send an error message saying that an account with this email already exists
                const error = {
                    message: 'An account with this email already exists',
                    status: 409 //Conflict
                }
                return done(JSON.stringify(error));
            }

            return done(null, existingUser); //Return the existing user

        } else {
            //Create new user
            const newUser = await prisma.users.create({
                data: {
                    username: profile.displayName,
                    email,
                    providers: {
                        create: {
                            providerName: 'linkedin',
                            providerId: profile.id,
                        }
                    }
                }
            });
            return done(null, newUser);
        }
    } catch (error) {
        return done(error);
    }
}));

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