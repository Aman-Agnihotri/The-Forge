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