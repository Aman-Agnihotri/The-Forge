import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../config/prisma";

/**
 * Middleware to verify JWT token and protect routes.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        try {
            const decodedUser = verifyToken(token);

            let user_id = '';

            if (typeof decodedUser !== 'string' && 'id' in decodedUser) {
                user_id = decodedUser.id;
            } else {
                return res.status(401).json({ message: 'Invalid token payload' });
            }

            const user = await prisma.users.findUnique({ where: { id: user_id },
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
                return res.status(401).json({ message: 'User not found' });
            }

            (req as any).user = user;
            return next();
        } catch (error) {
            console.error("Token verification error: " + error);
            return res.status(403).json({ message: "Invalid or expired authentication token" });
        }
    }

    // If no token, check if OAuth user is authenticated via Passport session
    // if(req.isAuthenticated?.()) {
    //     return next(); // User is authenticated via OAuth, proceed to the next middleware
    // }

    return res.status(401).json({ message: "Unauthorized, please log in" });
};