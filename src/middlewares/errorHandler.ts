import logger from '../services/logger';
import { Request, Response, NextFunction } from 'express';

/**
 * Centralized error handler middleware.
 *
 * Logs the error with the logger and sends a JSON response with the error message
 * and status code.
 *
 * @param {Error} err - The error that occurred
 * @param {Request} req - The Express request object
 * @param {Response} res - The Express response object
 * @param {NextFunction} next - The next middleware function in the chain
 */
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    
    logger.error(`Error occurred: ${err.message}`, {
        method: req.method,
        path: req.originalUrl,
        status: err.status || 500,
        stack: err.stack
    });

    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
    });
};

export default errorHandler;
