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
export const NODE_ENV = getEnvVar('NODE_ENV', 'development');

export const DATABASE_PROVIDER = getEnvVar('DATABASE_PROVIDER', 'postgresql');
export const DATABASE_URL = getEnvVar('DATABASE_URL');

export const JWT_SECRET = getEnvVar('JWT_SECRET');
export const JWT_EXPIRATION = getEnvVar('JWT_EXPIRATION', '12h');

export const clientIds = {
    google: getEnvVar('GOOGLE_CLIENT_ID'),
    github: getEnvVar('GITHUB_CLIENT_ID'),
    facebook: getEnvVar('FACEBOOK_CLIENT_ID'),
    linkedin: getEnvVar('LINKEDIN_CLIENT_ID')
};

export const clientSecrets = {
    google: getEnvVar('GOOGLE_CLIENT_SECRET'),
    github: getEnvVar('GITHUB_CLIENT_SECRET'),
    facebook: getEnvVar('FACEBOOK_CLIENT_SECRET'),
    linkedin: getEnvVar('LINKEDIN_CLIENT_SECRET')
};

export const providerScopes: Record<string, string[]> = {
    google: ['email', 'profile'],
    github: ['user:email'],
    facebook: ['email'],
    linkedin: ['r_emailaddress', 'r_liteprofile']
};

export type OAuthProvider = keyof typeof clientIds;

export const PROVIDERS = Object.keys(clientIds);

export const LOGGER = getEnvVar('LOGGER', 'pino');

export const LOG_LEVEL = getEnvVar('LOG_LEVEL', 'info');

export const DEFAULT_ROLE="user";