import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenExpiredError, JsonWebTokenError } from "../utils/jwt";
import { prisma } from "../config/prisma";
import logger from "../services/logger";

/**
 * Middleware to verify JWT token and protect routes.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')){
        // If no token, check if OAuth user is authenticated via Passport session
        // if(req.isAuthenticated?.()) {
        //     return next(); // User is authenticated via OAuth, proceed to the next middleware
        // }

        logger.warn("Unauthorized access: No authentication token provided");
        return res.status(401).json({ message: "Unauthorized, please log in" });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedUser = verifyToken(token);

        let user_id = '';

        if (typeof decodedUser !== 'string' && 'id' in decodedUser) {
            user_id = decodedUser.id;
        } else {
            logger.warn("Invalid token payload: " + JSON.stringify(decodedUser));
            return res.status(401).json({ message: 'Invalid token payload' });
        }

        const user = await prisma.users.findUnique({ where: { id: user_id, deletedAt: null },
            select: { 
                id: true,
                username: true,
                email: true,
                createdAt: true,
                roles: {
                    select: {
                        role: true
                    }
                },
                providers: {
                    select: {
                        providerName: true,
                        providerId: true
                    }
                }
            }
        });

        if (!user) {
            logger.warn("User with ID " + user_id + " not found. ");
            return res.status(404).json({ message: 'User not found' });
        }

        (req as any).user = user;
        return next();
    } catch (error) {
        if (error instanceof TokenExpiredError) {
            logger.warn("Token expired: " + error.message);
            return res.status(401).json({ message: "Token has expired" });

        } else if (error instanceof Error && error.message === 'invalid signature'){
            logger.warn("Invalid token signature: " + error.message);
            return res.status(401).json({ message: "Invalid token signature" });

        } else if (error instanceof JsonWebTokenError) {
            logger.warn("Malformed token: " + error.message);
            return res.status(401).json({ message: "Malformed token" });

        } else {
            next({ message: "An error occurred while token authentication.", error });
        }
    }

};