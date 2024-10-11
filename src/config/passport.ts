import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as LinkedinStrategy } from "passport-linkedin-oauth2";
import { prisma } from "./prisma";

if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
} else if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_SECRET environment variable is not set');
} else if (!process.env.GOOGLE_CALLBACK_URL) {
    throw new Error('GOOGLE_CALLBACK_URL environment variable is not set');
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
}, async (Request, accessToken, refreshToken, profile, done) => {
    try {
        //Find or create user in the database
        const user = await prisma.users.upsert({
            where: { email: profile.emails ? profile.emails[0].value : '' },
            update: {
                provider: 'google'
            },
            create: {
                email: profile.emails ? profile.emails[0].value : '',
                username: profile.displayName,
                password: '',
                provider: 'google', 
            }
        });
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

if (!process.env.GITHUB_CLIENT_ID) {
    throw new Error('GITHUB_CLIENT_ID environment variable is not set');
} else if (!process.env.GITHUB_CLIENT_SECRET) {
    throw new Error('GITHUB_CLIENT_SECRET environment variable is not set');
} else if (!process.env.GITHUB_CALLBACK_URL) {
    throw new Error('GITHUB_CALLBACK_URL environment variable is not set');
}

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL,
    passReqToCallback: true,
    scope: ['user:email']
}, async (Request: any, accessToken: any, refreshToken: any, profile: any, done: (error: any, user?: any) => void) => {
    try {
        //Find or create user in the database
        const user = await prisma.users.upsert({
            where: { email: profile.emails ? profile.emails[0].value : '' },
            update: {
                provider: 'github'
            },
            create: {
                email: profile.emails ? profile.emails[0].value : '',
                username: profile.username,
                password: '',
                provider: 'github',
            }
        });
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}))

if(!process.env.FACEBOOK_APP_ID) {
    throw new Error('FACEBOOK_APP_ID environment variable is not set');
} else if (!process.env.FACEBOOK_APP_SECRET) {
    throw new Error('FACEBOOK_APP_SECRET environment variable is not set');
} else if (!process.env.FACEBOOK_CALLBACK_URL) {
    throw new Error('FACEBOOK_CALLBACK_URL environment variable is not set');
}

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    passReqToCallback: true,
    enableProof: true,
    profileFields: ['id', 'displayName', 'email']
}, async (Request: any, accessToken: any, refreshToken: any, profile: any, done: (error: any, user?: any) => void) => {
    try {
        //Find or create user in the database
        const user = await prisma.users.upsert({
            where: { email: profile.emails ? profile.emails[0].value : '' },
            update: {
                provider: 'facebook'
            },
            create: {
                email: profile.emails ? profile.emails[0].value : '',
                username: profile.displayName,
                password: '',
                provider: 'facebook',
            }
        });
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

if (!process.env.LINKEDIN_CLIENT_ID) {
    throw new Error('LINKEDIN_CLIENT_ID environment variable is not set');
} else if (!process.env.LINKEDIN_CLIENT_SECRET) {
    throw new Error('LINKEDIN_CLIENT_SECRET environment variable is not set');
} else if (!process.env.LINKEDIN_CALLBACK_URL) {
    throw new Error('LINKEDIN_CALLBACK_URL environment variable is not set');
}

passport.use(new LinkedinStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: process.env.LINKEDIN_CALLBACK_URL,
    scope: ['r_emailaddress', 'r_liteprofile'],
    passReqToCallback: true
}, async (Request: any, accessToken: any, refreshToken: any, profile: any, done: (error: any, user?: any) => void) => {
    try {
        //Find or create user in the database
        const user = await prisma.users.upsert({
            where: { email: profile.emails ? profile.emails[0].value : '' },
            update: {
                provider: 'linkedin'
            },
            create: {
                email: profile.emails ? profile.emails[0].value : '',
                username: profile.displayName,
                password: '',
                provider: 'linkedin',
            }
        });
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user as Express.User);
});

export default passport;