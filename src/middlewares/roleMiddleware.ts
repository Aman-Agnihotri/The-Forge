import { Request, Response, NextFunction } from "express";
import logger from "../services/logger";

// Middleware to authorize roles
export const authorizeRoles = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user; // Access the authenticated user from the request

        if (!user) {
            logger.warn('Access denied: User not authenticated');
            res.status(403).json({ message: 'Access denied: User not authenticated' });
            return;
        }

        if (!user.roles || user.roles.length === 0) {
            logger.warn(`Access denied: User ${user.id} has no roles assigned`);
            res.status(403).json({ message: 'Access denied: User has no roles assigned' });
            return;
        }

        // Check if the user has at least one of the required roles
        const hasRole = user.roles.some((userRole: any) => roles.includes(userRole.role.name));
        if (!hasRole) {
            logger.warn(`Access denied: User ${user.id} has insufficient permissions`);
            res.status(403).json({ message: 'Access denied: insufficient permissions' });
            return;
        }
        
        logger.info(`User ${user.id} authorized with roles: ${user.roles.map((role: any) => role.role.name).join(', ')}`);
        next(); // User has the required role, proceed to the next middleware
    };
};