import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

// Middleware to authorize roles
export const authorizeRoles = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user; // Access the authenticated user from the request

        if (!user.roles || user.roles.length === 0) {
            logger.info(`Access denied: User '${user.id}' has no roles assigned.`);
            res.status(403).json({ message: 'Access denied.' });
            return;
        }

        // Check if the user has at least one of the required roles
        const rolesLower = roles.map(role => role.toLowerCase());
        const hasRole = user.roles.some((userRole: any) => rolesLower.includes(userRole.role.name.toLowerCase()));
        if (!hasRole) {
            logger.info(`Access denied: User '${user.id}' has insufficient permissions.`);
            res.status(403).json({ message: 'Access denied.' });
            return;
        }
        
        logger.debug(`User '${user.id}' authorized with roles: ${user.roles.map((role: any) => role.role.name).join(', ')}`);
        next(); // User has the required role, proceed to the next middleware
    };
};