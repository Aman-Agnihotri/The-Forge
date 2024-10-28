import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { Strategy as GithubStrategy } from "passport-github2";
import { Strategy as FacebookStrategy } from "passport-facebook";
// import { Strategy as LinkedinStrategy } from "passport-linkedin-oauth2";

import { 
    HOST_API_URL,
    OAuthProvider,
    clientIds,
    clientSecrets
} from "./constants";

import logger from "../services/logger";

/**
 * Returns the client ID for the specified OAuth provider.
 * @param provider - The OAuth provider to obtain the client ID for.
 * @returns The client ID for the specified OAuth provider.
 * @throws {Error} If the specified provider is unsupported.
 */
export function getClientId(provider: OAuthProvider) {
    const clientId = clientIds[provider];
    if (clientId) {
        return clientId;
    } else {
        logger.error(`Unsupported OAuth provider: ${provider}`);
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
}

/**
 * Retrieves the client secret for the specified OAuth provider.
 *
 * @param {OAuthProvider} provider - The provider for which to retrieve the client secret.
 * @returns {string} The client secret associated with the specified provider.
 * @throws {Error} If the specified provider is unsupported.
 */
export function getClientSecret(provider: OAuthProvider) {
    const clientSecret = clientSecrets[provider];

    if (clientSecret) {
        return clientSecret;
    } else {
        logger.error(`Unsupported OAuth provider: ${provider}`);
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
}

/**
 * Returns the OAuth callback URL for the specified provider.
 *
 * @param provider - The OAuth provider for which to obtain the callback URL.
 * @returns The OAuth callback URL for the specified provider.
 */
export function getAuthCallbackURL(provider: OAuthProvider) {
    return `${HOST_API_URL}/auth/${provider}/callback`;
}

type StrategyConstructor = new (options: any, verify: any) => any;

const strategies: Record<string, StrategyConstructor> = {
    GoogleStrategy,
    GithubStrategy,
    FacebookStrategy,
    // LinkedinStrategy,
};

/**
 * Creates an OAuth strategy for a given provider.
 * @param {string} provider The provider of the OAuth strategy.
 * @param {object} options The options for the OAuth strategy.
 * @param {function} verify The verify function for the OAuth strategy.
 * @returns {OAuthStrategy} The OAuth strategy for the given provider.
 */
export const createStrategy = (provider: OAuthProvider, options: any, verify: any) => {
    const strategyName = `${provider.charAt(0).toUpperCase()}${provider.slice(1)}Strategy`;
    
    const Strategy = strategies[strategyName];

    if (!Strategy) {
        logger.error(`Unsupported strategy provider: ${provider}`);
        throw new Error(`Unsupported strategy provider: ${provider}`);
    }

    return new Strategy(options, verify);
}