import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

/**
 * Middleware to verify JWT token and protect routes.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 */
export const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        try {
            const decodedUser = verifyToken(token);
            req.user = decodedUser;
            return next();
        } catch (error) {
            res.status(403).json({ message: "Invalid or expired token" });
        }
    }

    // If no token, check if OAuth user is authenticated via Passport session
    if(req.isAuthenticated?.()) {
        return next(); // User is authenticated via OAuth, proceed to the next middleware
    }

    res.status(401).json({ message: "Unauthorized, please log in" });
};