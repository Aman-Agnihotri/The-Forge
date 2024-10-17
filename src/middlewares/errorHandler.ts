import logger from '../services/logger';
import { Request, Response, NextFunction } from 'express';

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
