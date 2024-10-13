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
            }

            const user = await prisma.users.findUnique({ where: { id: user_id },
                include:{
                    roles: {
                        select: {
                            role: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            if (!user) {
                res.status(401).json({ message: 'User not found' });
                return;
            }

            (req as any).user = user;
            return next();
        } catch (error) {
            res.status(403).json({ message: "Invalid or expired authentication token" });
        }
    }

    // If no token, check if OAuth user is authenticated via Passport session
    if(req.isAuthenticated?.()) {
        return next(); // User is authenticated via OAuth, proceed to the next middleware
    }

    res.status(401).json({ message: "Unauthorized, please log in" });
};