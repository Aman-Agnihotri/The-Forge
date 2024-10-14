import { Request, Response, NextFunction } from "express";

// Middleware to authorize roles
export const authorizeRoles = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user; // Access the authenticated user from the request

        if (!user) {
            res.status(403).json({ message: 'Access denied: user not authenticated' });
            return;
        }

        if (!user.roles || user.roles.length === 0) {
            res.status(403).json({ message: 'Access denied: user has no roles assigned' });
            return;
        }

        // Check if the user has at least one of the required roles
        const hasRole = user.roles.some((userRole: any) => roles.includes(userRole.role.name));
        if (!hasRole) {
            res.status(403).json({ message: 'Access denied: insufficient permissions' });
            return;
        }
        
        next(); // User has the required role, proceed to the next middleware
    };
};