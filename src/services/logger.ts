import pino from 'pino';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

const usePino = process.env.LOGGER === 'pino'; // Set in your .env file

const { combine, timestamp, json, printf } = winston.format;
const timestampFormat = 'MMM-DD-YYYY HH:mm:ss';

// Pino configuration
const pinoLogger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: {
        target: 'pino-pretty', // Pretty logs for development
        options: { colorize: true }
    },
});

// Winston configuration
const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    format: combine(
        timestamp({ format: timestampFormat }),
        json(), // Use JSON format by default
        printf(({ timestamp, level, message, ...data }) => {
            const response = {
              level,
              message,
              data, // metadata
            };
            return JSON.stringify(response);
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'combined.log' }), // File transport for logs
        new winston.transports.File({ filename: 'error.log', level: 'error' }) // Separate error file
    ],
});

// Export the selected logger based on the environment variable
const logger = usePino ? pinoLogger : winstonLogger;

export default logger;