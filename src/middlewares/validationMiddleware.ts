import { Request, Response, NextFunction } from 'express';
import { roleActionSchema } from '../models/roleModel';
import { registerUserSchema, loginUserSchema, updateUserSchema } from '../models/userModel';
import logger from '../utils/logger';

function validateId(id: string) {
    const cuidRegex = /^c[0-9a-z]{24}$/i;
    return cuidRegex.test(id);
}

export const validateIdParam = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    if (!validateId(id)) {
        logger.info(`Request '${req.method} ${req.originalUrl}' failed. Invalid role ID format: ${id}`);
        res.status(400).json({ success: false, message: 'Invalid role ID format.' });
        return;
    }
    next();
};

const validateSchema = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {

        if(schema === loginUserSchema) {
            interface ValidationError {
                message: string;
            }

            const matchingError: ValidationError | undefined = parseResult.error.errors.find((error: ValidationError) =>
                error.message.includes("required") ||
                error.message.includes("empty") ||
                error.message.includes("Password")
            );

            if (matchingError) {
                logger.info(`Request '${req.method} ${req.originalUrl}' failed. Invalid request body.\nError: ${matchingError.message}`);
                res.status(400).json({ success: false, message: matchingError.message });
                return;
            } else {
                logger.info(`Request '${req.method} ${req.originalUrl}' failed. Invalid request body.\nError: ${parseResult.error.errors[0].message}`);
                res.status(400).json({ success: false, message: 'Invalid email or password.' });
                return;
            }
        }

        logger.info(`Request '${req.method} ${req.originalUrl}' failed. Invalid request body.\nError: ${parseResult.error.errors[0].message}`);
        res.status(400).json({ success: false, message: parseResult.error.errors[0].message });
        return;
    }
    req.body = parseResult.data;
    next();
};

export const validateBody = (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) {
        logger.info(`Request '${req.method} ${req.originalUrl}' failed. Request body is empty.`);
        res.status(400).json({ success: false, message: 'Request body is empty.' });
        return;
    }

    const routeValidationMap: { [key: string]: any } = {
        '/roles': roleActionSchema,
        '/users': req.method === 'POST' ? registerUserSchema : updateUserSchema,
        '/register': registerUserSchema,
        '/login': loginUserSchema,
    };

    for (const route in routeValidationMap) {
        if (req.originalUrl.includes(route)) {
            return validateSchema(routeValidationMap[route])(req, res, next);
        }
    }

    next();
};