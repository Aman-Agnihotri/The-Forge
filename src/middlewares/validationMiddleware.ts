import { Request, Response, NextFunction } from 'express';
import { roleActionSchema } from '../models/roleModel';
import logger from '../services/logger';

function validateId(id: string) {
    const cuidRegex = /^c[0-9a-z]{24}$/i;
    return cuidRegex.test(id);
}

export const validateIdParam = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    if (!validateId(id)) {
        logger.info(`Request '${req.method} ${req.originalUrl}' failed. Invalid role ID format: ${id}`);
        res.status(400).json({ message: 'Invalid role ID format.' });
        return;
    }
    next();
};

export const validateRoleBody = (req: Request, res: Response, next: NextFunction) => {
    const parseResult = roleActionSchema.safeParse(req.body);
    if (!parseResult.success) {
        logger.info(`Request '${req.method} ${req.originalUrl}' failed. Invalid request body.\nError: ${parseResult.error.errors[0].message}`);
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
    }
    req.body = parseResult.data;
    next();
};