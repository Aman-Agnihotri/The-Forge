import pino from 'pino';
import createRotatingWriteStream from 'pino-rotating-file-stream';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const usePino = process.env.LOGGER === 'pino'; // Set in your .env file

// Use process.cwd() to get the root directory of the project
const rootLogDir = path.resolve(process.cwd(), 'logs');
const winstonLogDir = path.join(rootLogDir, 'winston');
const pinoLogDir = path.join(rootLogDir, 'pino');

// Ensure the logs directory and subdirectories for winston and pino exist
const createLogDirectories = () => {
    if (!fs.existsSync(rootLogDir)) {
        fs.mkdirSync(rootLogDir);
        console.log('Created logs directory in project root');
    }
    if (!fs.existsSync(winstonLogDir)) {
        fs.mkdirSync(winstonLogDir);
        console.log('Created winston logs directory in project root');
    }
    if (!fs.existsSync(pinoLogDir)) {
        fs.mkdirSync(pinoLogDir);
        console.log('Created pino logs directory in project root');
    }
};

createLogDirectories();

// Define a rotating stream for Pino
const rotatingStream = createRotatingWriteStream({
    filename: 'server-%DATE%.log',
    path: pinoLogDir,
    interval: '1d', // Rotate logs daily
    maxFiles: 14, // Keep logs for 14 days
    compress: true, // Compress the old log files
});

// Pino configuration
const pinoLogger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: {
        target: 'pino-pretty', // Pretty logs for development
        options: { colorize: true }
    },
}, rotatingStream);

// Define the log formatting options for Winston
const { combine, timestamp, json, printf } = winston.format;
const timestampFormat = 'MMM-DD-YYYY HH:mm:ss';

// Define a daily rotate transport for Winston
const dailyRotateFileTransport = new DailyRotateFile({
    filename: path.join(winstonLogDir, 'server-combined-%DATE%.log'),  // Log file name pattern
    datePattern: 'YYYY-MM-DD',               // Rotate daily with date in file name
    zippedArchive: true,                     // Compress the rotated logs
    maxSize: '20m',                          // Maximum log file size before rotation (e.g., 20 megabytes)
    maxFiles: '14d',                         // Keep logs for the last 14 days
});

// Define an error file transport for Winston
const errorFileTransport = new DailyRotateFile({
    filename: path.join(winstonLogDir, 'server-error-%DATE%.log'),
    level: 'error',                          // Log only error messages in this file
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',                          // Keep error logs for 30 days
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
        dailyRotateFileTransport,
        errorFileTransport
    ],
});

// If we're not in production, show human-readable output in the console
if (process.env.NODE_ENV !== 'production') {
    winstonLogger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Export the selected logger based on the environment variable
const logger = usePino ? pinoLogger : winstonLogger;

export default logger;