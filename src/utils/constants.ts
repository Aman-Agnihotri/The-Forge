import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

dotenvExpand.expand(dotenv.config());

/**
 * Retrieves the value of an environment variable.
 *
 * @param name - The name of the environment variable to retrieve.
 * @param defaultValue - An optional default value to return if the environment variable is not set.
 * @returns The value of the environment variable, or the default value if provided.
 * @throws Error if the environment variable is not set and no default value is provided.
 */
function getEnvVar(name: string, defaultValue?: string): string {
    const value = process.env[name];

    if (!value) {
        if (defaultValue) {
            return defaultValue;
        } else {
            console.error(`Missing required environment variable: ${name}`);
            throw new Error(`Missing required environment variable: ${name}`);
        }
    }

    return value;
}

export const PORT = getEnvVar('PORT', '5000');
export const API_VERSION = 'v1';
export const API_PATH = '/' + API_VERSION;

export const HOST_API_URL = getEnvVar('HOST_API_URL', 'http://localhost:${PORT}') + API_PATH;
export const HOST_UI_URL = getEnvVar('HOST_UI_URL');
export const NODE_ENV = getEnvVar('NODE_ENV');

if (NODE_ENV !== 'test' && NODE_ENV !== 'dev' && NODE_ENV !== 'prod') {
    console.error(`Invalid NODE_ENV: ${NODE_ENV}`);
    throw new Error(`Invalid NODE_ENV: ${NODE_ENV}`);
}

export const DATABASE_PROVIDER = getEnvVar('DATABASE_PROVIDER', 'postgresql');
export const DATABASE_URL = getEnvVar('DATABASE_URL');

export const JWT_SECRET = getEnvVar('JWT_SECRET');
export const JWT_EXPIRATION = getEnvVar('JWT_EXPIRATION', '15m');
export const REFRESH_JWT_SECRET = getEnvVar('REFRESH_JWT_SECRET');
export const REFRESH_JWT_EXPIRATION = getEnvVar('REFRESH_JWT_EXPIRATION', '7d');

export const clientIds = {
    google: getEnvVar('GOOGLE_CLIENT_ID'),
    github: getEnvVar('GITHUB_CLIENT_ID'),
    facebook: getEnvVar('FACEBOOK_CLIENT_ID'),
    // linkedin: getEnvVar('LINKEDIN_CLIENT_ID')
};

export const clientSecrets = {
    google: getEnvVar('GOOGLE_CLIENT_SECRET'),
    github: getEnvVar('GITHUB_CLIENT_SECRET'),
    facebook: getEnvVar('FACEBOOK_CLIENT_SECRET'),
    // linkedin: getEnvVar('LINKEDIN_CLIENT_SECRET')
};

export const providerScopes: Record<string, string[]> = {
    google: ['email', 'profile'],
    github: ['user:email'],
    facebook: ['email'],
    // linkedin: ['r_emailaddress', 'r_liteprofile']
};

export type OAuthProvider = keyof typeof clientIds;

export const PROVIDERS = Object.keys(clientIds);

export const LOGGER = getEnvVar('LOGGER', 'pino');

export const LOG_LEVEL = getEnvVar('LOG_LEVEL', 'info');

export const DEFAULT_ROLE="user";

// Allowed IP addresses for rate limit bypass for testing
export const rateLimitBypassIp = "244.128.248.221";

export const testIP = "123.45.67.89";
export const testUserIP = "217.137.153.227";
export const testAdminIP = "198.15.177.9";

const isTestEnv = NODE_ENV === "test";

// Configuration object for rate limiting
export const rateLimitConfig = {
    ip: {
        windowMs: isTestEnv? 1000 : 10 * 60 * 1000, // 10 minutes or 1 second in test environment
        limit: isTestEnv? 60 : 1000                 // 1000 requests per 10 minutes or 60 requests per second in test environment 
    },
    login: {
        windowMs: isTestEnv? 1000 : 15 * 60 * 1000, // 15 minutes or 1 second in test environment
        limit: isTestEnv? 3 : 5                     // 5 requests per 15 minutes or 3 requests per second in test environment
    },
    registration: {
        windowMs: isTestEnv? 1000 : 15 * 60 * 1000, // 15 minutes or 1 second in test environment
        limit: isTestEnv? 3 : 5                     // 5 requests per 15 minutes or 3 requests per second in test environment
    },
    token_refresh: {
        windowMs: isTestEnv? 1000 : 15 * 60 * 1000, // 15 minutes or 1 second in test environment
        limit: 3                                    // 3 requests per 15 minutes or 3 requests per second in test environment
    },
    oauth: {
        windowMs: isTestEnv? 1000 : 15 * 60 * 1000, // 15 minutes or 1 second in test environment
        limit: isTestEnv? 3 : 5                     // 5 requests per 15 minutes or 3 requests per second in test environment
    },
    roles: {
        admin: { 
            points: isTestEnv? 20 : 5000, 
            duration: isTestEnv? 1 : 60 * 60
        }, // 5000 requests per hour or 20 requests per second in test environment
        user: { 
            points: isTestEnv? 10 : 500,
            duration: isTestEnv? 1 : 60 * 60
        }  // 500 requests per hour or 10 requests per second in test environment
    }
};

export const getRateLimitConfig = () => rateLimitConfig;