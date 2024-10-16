import { RateLimiterMemory } from "rate-limiter-flexible";
import { Request, Response, NextFunction } from "express";

// Create a user-based rate limiter (e.g., 1000 requests per hour per user)
const userRateLimiter = new RateLimiterMemory({
    points: 1000, // Number of requests
    duration: 60 * 60, // Per 1 hour
});

// Define rate limits for different roles (requests per hour)
const rateLimitsByRole = {
    admin: { points: 5000, duration: 60 * 60 }, // 5000 requests per hour for admins
    user: { points: 1000, duration: 60 * 60 },  // 1000 requests per hour for regular users
    guest: { points: 500, duration: 60 * 60 },  // 500 requests per hour for guest or lower roles
};

// Create a RateLimiterMemory instance for each role
const rateLimiters = {
    admin: new RateLimiterMemory(rateLimitsByRole.admin),
    user: new RateLimiterMemory(rateLimitsByRole.user),
    guest: new RateLimiterMemory(rateLimitsByRole.guest),
};

const rolePriority = { admin: 3, user: 2, guest: 1 };

/**
 * Express middleware to enforce rate limiting based on user roles. The rate limit is
 * determined by the highest role assigned to the user. If no roles are assigned, the
 * default role is 'guest'.
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

    if (!user?.id) {
        res.status(403).json({ message: 'Access denied: User is not authenticated' });
        return;
    }

    if (!user.roles || user.roles.length === 0) {
        res.status(403).json({ message: 'Access denied: User has no roles assigned' });
        return;
    }

    const userID = user.id;

    // Determine the user role (default to 'guest' if not specified)
    const role = user.roles.reduce((highestRole: keyof typeof rolePriority, currentRole: { role: { name: keyof typeof rolePriority } }) => {
        return rolePriority[currentRole.role.name] > rolePriority[highestRole] ? currentRole.role.name : highestRole;
    }, 'guest');

    const rateLimiter = rateLimiters[role as keyof typeof rateLimiters] || rateLimiters.guest;

    rateLimiter.consume(userID, 1)
    .then(() => {
        next();
    }).catch(() => {
        return res.status(429).json({ message: 'Too many requests, please try again later.' });  // Limit exceeded
    });

}