import { RateLimiterMemory } from "rate-limiter-flexible";
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import logger from "../services/logger";
import { rateLimitBypassIp, rateLimitConfig } from "../utils/constants";

/**
 * Creates an IP rate limiter based on the given configuration.
 * @param {Object} [config=rateLimitConfig.ip] - The configuration object to use for the rate limiter.
 * @property {number} config.windowMs - The time frame in milliseconds for the rate limit.
 * @property {number} config.limit - The maximum number of requests allowed in the time frame.
 * @property {string} config.message - The message to return when the rate limit is exceeded.
 * @returns {express.RequestHandler} The IP rate limiter middleware.
 */
export const createIpRateLimiter = (config = rateLimitConfig.ip) => rateLimit({
    windowMs: config.windowMs,
    limit: config.limit,
    message: "Too many requests from this IP, please try again after " + config.windowMs / 1000 + " seconds.",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req: Request, res: Response) => rateLimitBypassIp.includes(req.ip as string),
    handler: (req, res, next, options) => {
        logger.warn(`IP rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).json({ message: options.message });
    }
});

// Export the IP rate limiter
export const ipRateLimiter = createIpRateLimiter();

/**
 * Creates a login rate limiter based on the given configuration.
 * @param {Object} [config=rateLimitConfig.login] - The configuration object for the rate limiter.
 * @property {number} config.windowMs - The time frame in milliseconds for the rate limit.
 * @property {number} config.limit - The maximum number of login attempts allowed in the time frame.
 * @property {string} config.message - The message to return when the rate limit is exceeded.
 * @returns {express.RequestHandler} The login rate limiter middleware.
 */
export const createLoginRateLimiter = (config = rateLimitConfig.login) => rateLimit({
    windowMs: config.windowMs,
    limit: config.limit,
    message: "Too many login attempts from this IP, please try again after " + config.windowMs / 1000 + " seconds.",
    standardHeaders: true,
    skip: (req: Request, res: Response) => rateLimitBypassIp.includes(req.ip as string),
    handler: (req, res, next, options) => {
        logger.warn(`Login rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).json({ message: options.message });
    }
});

// Export the login rate limiter
export const loginRateLimiter = createLoginRateLimiter();

/**
 * Creates a registration rate limiter based on the given configuration.
 * 
 * @param {Object} [config=rateLimitConfig.login] - The configuration object for the rate limiter.
 * @property {number} config.windowMs - The time frame in milliseconds for the rate limit.
 * @property {number} config.limit - The maximum number of registration attempts allowed in the time frame.
 * @property {string} config.message - The message to return when the rate limit is exceeded.
 * 
 * @returns {express.RequestHandler} The registration rate limiter middleware.
 */
export const createRegistrationRateLimiter = (config = rateLimitConfig.registration) => rateLimit({
    windowMs: config.windowMs,
    limit: config.limit,
    message: "Too many registration attempts from this IP, please try again after " + config.windowMs / 1000 + " seconds.",
    standardHeaders: true,
    skip: (req: Request, res: Response) => rateLimitBypassIp.includes(req.ip as string),
    handler: (req, res, next, options) => {
        logger.warn(`Registration rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).json({ message: options.message });
    }
});

// Export the registration rate limiter
export const registrationRateLimiter = createRegistrationRateLimiter();

/**
 * Creates a token refresh rate limiter based on the given configuration.
 * 
 * @param {Object} [config=rateLimitConfig.token_refresh] - The configuration object for the rate limiter.
 * @property {number} config.windowMs - The time frame in milliseconds for the rate limit.
 * @property {number} config.limit - The maximum number of token refresh attempts allowed in the time frame.
 * @property {string} config.message - The message to return when the rate limit is exceeded.
 * 
 * @returns {express.RequestHandler} The token refresh rate limiter middleware.
 */
export const createTokenRefreshRateLimiter = (config = rateLimitConfig.token_refresh) => rateLimit({
    windowMs: config.windowMs,
    limit: config.limit,
    message: "Too many token refresh attempts from this IP, please try again after " + config.windowMs / 1000 + " seconds.",
    standardHeaders: true,
    skip: (req: Request, res: Response) => rateLimitBypassIp.includes(req.ip as string),
    handler: (req, res, next, options) => {
        logger.warn(`Token refresh rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).json({ message: options.message });
    }
});

// Export the token refresh rate limiter
export const tokenRefreshRateLimiter = createTokenRefreshRateLimiter();

/**
 * Creates an OAuth login rate limiter based on the given configuration.
 * 
 * @param {Object} [config=rateLimitConfig.oauth] - The configuration object for the rate limiter.
 * @property {number} config.windowMs - The time frame in milliseconds for the rate limit.
 * @property {number} config.limit - The maximum number of OAuth login attempts allowed in the time frame.
 * @property {string} config.message - The message to return when the rate limit is exceeded.
 * 
 * @returns {express.RequestHandler} The OAuth login rate limiter middleware.
 */
export const createOauthLoginRateLimiter = (config = rateLimitConfig.oauth) => rateLimit({
    windowMs: config.windowMs,
    limit: config.limit,
    standardHeaders: true,
    message: "Too many login attempts from this IP, please try again after " + config.windowMs / 1000 + " seconds.",
    skip: (req: Request, res: Response) => rateLimitBypassIp.includes(req.ip as string),
    handler: (req, res, next, options) => {
        logger.warn(`OAuth login rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).json({ message: options.message });
    }
});

// Export the OAuth login rate limiter
export const oauthLoginRateLimiter = createOauthLoginRateLimiter();

/**
 * Creates an OAuth linking rate limiter based on the given configuration.
 * 
 * @param {Object} [config=rateLimitConfig.oauth] - The configuration object for the rate limiter.
 * @property {number} config.windowMs - The time frame in milliseconds for the rate limit.
 * @property {number} config.limit - The maximum number of OAuth linking attempts allowed in the time frame.
 * @property {string} config.message - The message to return when the rate limit is exceeded.
 * 
 * @returns {express.RequestHandler} The OAuth linking rate limiter middleware.
 */
export const createOauthLinkingRateLimiter = (config = rateLimitConfig.oauth) => rateLimit({
    windowMs: config.windowMs,
    limit: config.limit,
    standardHeaders: true,
    message: "Too many OAuth linking attempts from this IP, please try again after " + config.windowMs / 1000 + " seconds.",
    skip: (req: Request, res: Response) => rateLimitBypassIp.includes(req.ip as string),
    handler: (req, res, next, options) => {
        logger.warn(`OAuth linking rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).json({ message: options.message });
    }
});

// Export the OAuth linking rate limiter
export const oauthLinkingRateLimiter = createOauthLinkingRateLimiter();

/**
 * Creates an OAuth unlinking rate limiter based on the given configuration.
 * 
 * @param {Object} [config=rateLimitConfig.oauth] - The configuration object for the rate limiter.
 * @property {number} config.windowMs - The time frame in milliseconds for the rate limit.
 * @property {number} config.limit - The maximum number of OAuth unlinking attempts allowed in the time frame.
 * @property {string} config.message - The message to return when the rate limit is exceeded.
 * 
 * @returns {express.RequestHandler} The OAuth unlinking rate limiter middleware.
 */
export const createOauthUnlinkingRateLimiter = (config = rateLimitConfig.oauth) => rateLimit({
    windowMs: config.windowMs,
    limit: config.limit,
    standardHeaders: true,
    message: "Too many OAuth unlinking attempts from this IP, please try again after " + config.windowMs / 1000 + " seconds.",
    skip: (req: Request, res: Response) => rateLimitBypassIp.includes(req.ip as string),
    handler: (req, res, next, options) => {
        logger.warn(`OAuth unlinking rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).json({ message: options.message });
    }
});

// Export the OAuth unlinking rate limiter
export const oauthUnlinkingRateLimiter = createOauthUnlinkingRateLimiter();

// Create a RateLimiterMemory instance for each role
const rateLimiters = {
    admin: new RateLimiterMemory(rateLimitConfig.roles.admin),
    user: new RateLimiterMemory(rateLimitConfig.roles.user),
};

const rolePriority = { admin: 3, user: 2, guest: 1 };

/**
 * Express middleware to enforce rate limiting based on user roles. The rate limit is
 * determined by the highest role assigned to the user. If no roles are assigned, the
 * default role is 'user'.
 *
 * @param {Request} req - The incoming request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next middleware function in the chain
 *
 * @throws {HttpError} If the rate limit has been exceeded
 *
 * @returns {Promise<void>} A promise that resolves when the rate limiter has been successfully consumed
 */
export const useRateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user; // Access the authenticated user from the request

    // Check if the request IP is in the bypass list
    if (rateLimitBypassIp.includes(req.ip as string)) {
        logger.info(`Rate limit bypass for IP: ${req.ip}`);
        return next();
    }

    if (!user.roles || user.roles.length === 0) {
        logger.warn(`Access denied: User has no roles assigned. User ID: ${user.id}, IP: ${req.ip}`);
        res.status(403).json({ message: 'Access denied: User has no roles assigned' });
        return;
    }

    const userID = user.id;

    // Determine the user role (default to 'user' if not specified)
    const role = user.roles.reduce((highestRole: keyof typeof rolePriority, currentRole: { role: { name: keyof typeof rolePriority } }) => {
        return rolePriority[currentRole.role.name] > rolePriority[highestRole] ? currentRole.role.name : highestRole;
    }, 'user');

    const rateLimiter = rateLimiters[role as keyof typeof rateLimiters] || rateLimiters.user;

    rateLimiter.consume(userID, 1)
    .then(() => {
        next();
    }).catch(() => {
        logger.warn(`Rate limit exceeded for user ID: ${userID}, Role: ${role}, IP: ${req.ip}`);
        return res.status(429).json({ message: `Too many requests, please try again after ${rateLimiter.msDuration / 1000} seconds.` });  // Limit exceeded
    });
}